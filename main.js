var camera, camera2, activeCamera, orthographicCamera, scene, renderer, controls;

//game variables
var plane, world, physicsMaterial, timeStep = 1 / 60;
var stonesBody = [], stonesMesh = [], catapultsBody = [], catapultsMesh = [];
var standsBody = [], standsMesh = [], collidables = [];
var mainStandBody, mainStandSize;
var userShootVelocity = 4;
var level;
var attackSet;
var xPositions = [-46, -40, -28, -18, -5];
var time = new Date();
var catapultModel;
var cameraChange = 2;
var endInterval ,collisonInterval;
//library variables
var stats;
var gltfloader = new THREE.GLTFLoader();
var keyboard = new THREEx.KeyboardState();
var audioLoader = new THREE.AudioLoader();

//window variables
window.addEventListener("keyup", function (e) {

    if (e.keyCode == 65) {
        throwStone(catapultsBody[0], new THREE.Vector3(1, 1, 0), userShootVelocity, "user");
    }
    if (e.keyCode == 67) {
        if (cameraChange > 0) {
            if (activeCamera === camera) {
                activeCamera = camera2;
                cameraChange--;
            } else {
                activeCamera = camera;
                cameraChange--;
            }
        }

    }
    var loading = document.getElementById("loading").innerHTML;
    if (e.keyCode == 32 && loading === "ready to go !") {
        cameraChange =2;
        clearInterval(endInterval);
        clearInterval(collisonInterval);
        level = parseInt(prompt("Please enter hardship level you want \n choose between 1 to 4", 1));
        if (level > 4) {
            level = 4;
        }
        positioningEnemies(level);
        startBackgroundMusic();
        activeCamera = camera;
        document.getElementById("instruction").style.display = "none";
        document.getElementById("game").style.display = "none";
        document.getElementById("game").innerHTML = "";


        endInterval = setInterval(function () {
            if (catapultsMesh[0].parent == null) {
                gameOver();
            }
            var check = 0;
            for (let i = 1; i < level + 1; i++) {
                if (catapultsMesh[i].parent == scene) {
                    check++;
                }
            }
            if (check === 0) {
                victory();
                //console.log(catapultsMesh);
            }
        }, 5000);
        collisonInterval =setInterval(function () {
            for (let i = 0; i < stonesMesh.length; i++) {
                checkCollison(stonesMesh[i], collidables);
            }
        }, 130);
    }

});
window.addEventListener('resize', onWindowResize, false);
gltfloader.load('models/catapult2/scene.gltf', createCatapults);
gltfloader.load('models/tower1/scene.gltf', createTower);

initCannon();
init();
update();


function initCannon() {

    // Setup our world
    world = new CANNON.World();
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;
    var solver = new CANNON.GSSolver();
    solver.iterations = 10;
    solver.tolerance = 0.1;
    world.defaultContactMaterial.contactEquationStiffness = 1e8;
    world.defaultContactMaterial.contactEquationRelaxation = 3;
    var split = true;
    if (split)
        world.solver = new CANNON.SplitSolver(solver);
    else
        world.solver = solver;
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();

    // Create a ground material (friction coefficient = 0.5)
    physicsMaterial = new CANNON.Material("groundMaterial");
    //creat a contact material
    var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
        physicsMaterial,
        {
            friction: 200.6, // friction coefficient
            frictionEquationStiffness: 1e8,
            frictionEquationRegularizationTime: 3,
            restitution: 0.3,  // restitution
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3
        }
    );

    world.addContactMaterial(physicsContactMaterial);

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({mass: 0, material: physicsMaterial});
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.add(groundBody);


    //create stand for main catapult
    mainStandSize = new CANNON.Vec3(2, 7, 3);
    var mainStandShape = new CANNON.Box(mainStandSize);
    mainStandBody = new CANNON.Body({mass: 0, material: physicsMaterial});
    mainStandBody.addShape(mainStandShape);
    mainStandBody.position.set(-60, 5, 0);
    world.add(mainStandBody);


}

function init() {
    //var status
    stats = createStats();
    document.body.appendChild(stats.domElement);


    //making a scene
    scene = new THREE.Scene();
    //scene.fog = new THREE.FogExp2(0xffffff,0.08);


    //renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(new THREE.Color(0x000000));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('webgl').appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;


    //making our scene objects

    //plane texture
    var planeTexture = new THREE.TextureLoader().load("texture/Grass.jpg");
    planeTexture.repeat.set(20, 20);
    planeTexture.wrapS = THREE.RepeatWrapping;
    planeTexture.wrapT = THREE.RepeatWrapping;
    planeTexture.magFilter = THREE.NearestFilter;
    planeTexture.minFilter = THREE.LinearMipMapLinearFilter;

    //plane mesh
    var geometry = new THREE.PlaneGeometry(512, 512);
    var material = new THREE.MeshStandardMaterial({
        color: 0x232426,
        side: THREE.BackSide,
        map: planeTexture,
        bumpMap: planeTexture,
        bumpScale: 0.1

    });
    var plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    //sky box
    var reflectionCube = new THREE.CubeTextureLoader()
        .setPath('texture/skybox4/')
        .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
    reflectionCube.format = THREE.RGBFormat;
    scene.background = reflectionCube;


    //create reusable game objects
    createStones();
    createStands();


    //lights
    var ambiantlight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambiantlight);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.position.set(-50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.right = 550;
    directionalLight.shadow.camera.left = -550;
    directionalLight.shadow.camera.top = 550;
    directionalLight.shadow.camera.bottom = -550;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    scene.add(directionalLight);/*
    var helper = new THREE.DirectionalLightHelper( directionalLight, 500 );
    scene.add( helper );

*/
    //cameras
    camera = new THREE.PerspectiveCamera(
        100,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.x = -64;
    camera.position.y = 14;
    camera.position.z = 7;


    camera2 = new THREE.PerspectiveCamera(
        100,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );

    camera2.position.x = -62;
    camera2.position.y = 16;
    camera2.position.z = 0;


    /*var helper = new THREE.CameraHelper( camera );
    scene.add( helper );*/

    orthographicCamera = new THREE.OrthographicCamera(window.innerWidth / -40, window.innerWidth / 40, window.innerHeight / 40, window.innerHeight / -40, 0.01, 1000);
    orthographicCamera.position.set(0, 8, 15);
    camera.add(orthographicCamera);


    //setting default active camera

    activeCamera = camera;

    //adding orbit controls
    //controls = new THREE.OrbitControls(activeCamera, renderer.domElement);


    orthographicCamera.lookAt(-30, 10, 0);


    var look1 = new THREE.Vector3(-47, 10, 0);
    camera.lookAt(look1);

    var look2 = new THREE.Vector3(-47, 14, 0);
    camera2.lookAt(look2);


    //using gui to set the scene
    /*

        var gui = new dat.GUI();
        var folder1 = gui.addFolder("camera and  light");
         folder1.add(ambiantlight, 'intensity', 0, 10);
         folder1.add(activeCamera.position, 'z', -200, 200);
         folder1.add(activeCamera.position, 'x', -200, 200);
         folder1.add(activeCamera.position, 'y', -200, 200);
    */

}


function updatePhysics() {

    // Step the physics world
    world.step(timeStep);
    //update stones
    for (let i = 0; i < stonesBody.length; i++) {
        stonesMesh[i].position.copy(stonesBody[i].position);
        stonesMesh[i].quaternion.copy(stonesBody[i].quaternion);
    }
    //update catapults
    for (let i = 0; i < catapultsBody.length; i++) {
        catapultsMesh[i].position.copy(catapultsBody[i].position);
        catapultsMesh[i].quaternion.copy(catapultsBody[i].quaternion);
    }
    for (let i = 0; i < standsBody.length; i++) {
        standsMesh[i].position.copy(standsBody[i].position);
        standsMesh[i].quaternion.copy(standsBody[i].quaternion);
    }
}


function update() {

    //getting and showing the velocity
    if (keyboard.pressed('A')) {
        if (userShootVelocity < 50) {
            document.getElementById("power").innerHTML = "power :" + userShootVelocity;
            userShootVelocity += 0.5;
        }
    }

    //update our scene here
    renderer.render(scene, activeCamera);
    stats.update();
    updatePhysics();
    requestAnimationFrame(function () {
        update();
    });
}

function checkCollison(stoneMesh, collidableMeshList) {

    var originPoint = stoneMesh.position.clone();
    for (var vertexIndex = 0; vertexIndex < stoneMesh.geometry.vertices.length; vertexIndex++) {
        var localVertex = stoneMesh.geometry.vertices[vertexIndex].clone();
        var globalVertex = localVertex.applyMatrix4(stoneMesh.matrix);
        var directionVector = globalVertex.sub(stoneMesh.position);

        var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
        var collisionResults = ray.intersectObjects(collidableMeshList);

        if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
            //console.log(collisionResults);

            removeCatapult(collisionResults[0].object.name, stoneMesh.name);

        }
    }
}


function startBackgroundMusic() {
    var listener = new THREE.AudioListener();
    var soundX = new THREE.PositionalAudio(listener);
    audioLoader.load('sound/background.ogg', function (buffer) {
        soundX.setBuffer(buffer);
        soundX.setRefDistance(15);
        soundX.play();
    });
    scene.add(soundX);
    camera.add(listener);
}

function gameOver() {
    activeCamera = orthographicCamera;
    clearInterval(attackSet);
    document.getElementById("game").innerHTML = "Game over";
    document.getElementById("game").style.color = "red";
    document.getElementById("game").style.display = "block";
    positionUser();
}

function createCatapults(gltf) {

    catapultModel = gltf.scene;
    //tower.children[0].children[0].children[0].children[3].visible = false;
    catapultModel.scale.set(1 / 3, 1 / 3, 1 / 3);
    var halfExt = new CANNON.Vec3(0.2, 0.8, 0.8);
    for (let i = 0; i < 5; i++) {
        var catapultShape = new CANNON.Box(halfExt);
        var catapultBody = new CANNON.Body({mass: 0});
        catapultBody.addShape(catapultShape);

        catapultsBody.push(catapultBody);
        catapultsMesh.push(catapultModel.clone());
    }
    createCollidableMesh();

    //setting user position
    positionUser();
}
function positionUser(){
    world.add(catapultsBody[0]);
    scene.add(catapultsMesh[0]);
    catapultsBody[0].position.set(mainStandBody.position.x - 1.5, mainStandBody.position.y + mainStandSize.y, mainStandBody.position.z + 1);
    collidables[0].position.set(mainStandBody.position.x - 0.3, mainStandBody.position.y + mainStandSize.y + 1, mainStandBody.position.z);
    scene.add(collidables[0]);

    //todo rotate the main catapult

    /* catapultsMesh[0].lookAt(new THREE.Vector3(1,5,0));
     catapultsMesh[0].rotation.y = (Math.PI/3) ;*/
}
function createCollidableMesh() {
    for (let i = 0; i < 5; i++) {
        var collideGeometry = new THREE.BoxGeometry(3.2, 1.5, 3);
        var material = new THREE.MeshBasicMaterial({
            opacity: 0,
            side: THREE.FrontSide,
        });

        material.transparent = true;
        var mesh = new THREE.Mesh(collideGeometry, material);
        mesh.name = i;
        collidables.push(mesh);
    }
}

function removeCatapult(catapultName, stoneName) {
    if ((stoneName === "enemy" && catapultName == 0) || (stoneName === "user" && catapultName > 0)) {
        scene.remove(collidables[catapultName]);
        scene.remove(catapultsMesh[catapultName]);
        catapultsBody[catapultName].position.set(100, -100, 100);
        scene.remove(standsMesh[catapultName]);
        standsBody[catapultName].position.set(100, -100, 100);
    }
}

function victory() {
    activeCamera = orthographicCamera;
    if (attackSet) {
        clearInterval(attackSet);
    }
    document.getElementById("game").innerHTML = "Victory";
    document.getElementById("game").style.color = "#0AB408";
    document.getElementById("game").style.display = "block";
}

function createTower(gltf) {
    var tower;
    tower = gltf.scene;
    //tower.children[0].children[0].children[0].children[3].visible = false;
    tower.scale.set(1 / 26, 1 / 15, 1 / 26);
    tower.position.set(mainStandBody.position.x, mainStandBody.position.y - 4, mainStandBody.position.z);
    tower.castShadow = true;
    scene.add(tower);

}

function createStands() {
    var standTexture = new THREE.TextureLoader().load("texture/brick_stone_wall.jpg");
    standTexture.repeat.set(1, 1);
    standTexture.wrapS = THREE.RepeatWrapping;
    standTexture.wrapT = THREE.RepeatWrapping;
    standTexture.magFilter = THREE.NearestFilter;
    standTexture.minFilter = THREE.LinearMipMapLinearFilter;

    for (let i = 0; i < 5; i++) {

        var halfExt = new CANNON.Vec3(3, 0.6, 3);
        var standShape = new CANNON.Box(halfExt);
        var standBody = new CANNON.Body({mass: 0});
        standBody.addShape(standShape);
        standsBody.push(standBody);

        //making mesh for our stone and add it to the scene and mesh array
        var standGeometry = new THREE.BoxGeometry(halfExt.x * 2, halfExt.y * 2, halfExt.z * 2);
        var material = new THREE.MeshPhongMaterial({color: 0x232426, map: standTexture});
        var standMesh = new THREE.Mesh(standGeometry, material);
        standsMesh.push(standMesh);
    }
}

function createStones() {


    var stoneTexture = new THREE.TextureLoader().load("texture/stoneTexture1.jpg");
    stoneTexture.repeat.set(1, 1);
    stoneTexture.wrapS = THREE.RepeatWrapping;
    stoneTexture.wrapT = THREE.RepeatWrapping;
    stoneTexture.magFilter = THREE.NearestFilter;
    stoneTexture.minFilter = THREE.LinearMipMapLinearFilter;
    for (let i = 0; i < 20; i++) {

        //make a body for our stone and add it to body array
        var stoneShape = new CANNON.Sphere(0.3);
        var stoneBody = new CANNON.Body({mass: 80, material: physicsMaterial});
        stoneBody.addShape(stoneShape);
        stonesBody.push(stoneBody);

        //making mesh for our stone and add it to mesh array
        var stoneGeometry = new THREE.SphereGeometry(stoneShape.radius, 8, 8);
        var material = new THREE.MeshLambertMaterial({
            color: 0x232426,
            side: THREE.FrontSide,
            map: stoneTexture
        });
        var stoneMesh = new THREE.Mesh(stoneGeometry, material);
        stoneMesh.castShadow = true;
        stonesMesh.push(stoneMesh);
    }

}

function getNewPosition(index) {
    var position = new THREE.Vector3();
    var x = xPositions[index];
    var y = Math.floor(Math.random() * 20) + 5;
    position.set(x, y, 0.7);
    return position;
}

function positioningEnemies(number) {
    if (attackSet) {
        clearInterval(attackSet);
    }
    for (let i = 1; i < number + 1; i++) {
        var newPosition = getNewPosition(i);
        world.add(catapultsBody[i]);
        scene.add(catapultsMesh[i]);
        catapultsBody[i].position.copy(newPosition);

        //make collidable mesh

        collidables[i].position.set(newPosition.x + 1, newPosition.y + 1, newPosition.z);
        scene.add(collidables[i]);

        //adding stand

        standsBody[i].position.set(newPosition.x + 1, newPosition.y - 0.9, newPosition.z - 0.5);
        world.add(standsBody[i]);
        scene.add(standsMesh[i]);

    }
    level = number;
    attackSet = setInterval(enemyAttack, 3000);
}


function enemyAttack() {

    for (let i = 1; i < level + 1; i++) {
        if (catapultsBody[i].world === world) {
            throwStone(catapultsBody[i], new THREE.Vector3(-1, 1, 0), Math.random() * 12.5 + 8, "enemy")
        }
    }

}

var countStones = 0;

function throwStone(catapultBody, shootDirection, shootVelocity, name) {
    if (countStones > 19) {
        countStones = 0;
    }

    //shooting coordinate
    var x = catapultBody.position.x;
    var y = catapultBody.position.y;
    var z = catapultBody.position.z;

    let stoneBody = stonesBody[countStones];
    let stoneMesh = stonesMesh[countStones];
    scene.add(stoneMesh);
    world.add(stoneBody);

    stoneBody.velocity.set(
        shootDirection.x * shootVelocity,
        shootDirection.y * shootVelocity,
        shootDirection.z * shootVelocity);

    //positioning stone out of shooting place
    x += shootDirection.x * (2);
    y += shootDirection.y * (3);
    z += shootDirection.z * (2);

    stoneBody.position.set(x, y, z);
    stoneMesh.position.set(x, y, z);
    stoneMesh.name = name;
    userShootVelocity = 0;
    countStones++;
}

function createStats() {
    var stats = new Stats();
    stats.setMode(0);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0';
    stats.domElement.style.top = '0';
    return stats;
}


function onWindowResize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (width < 500 || height < 500) {
        document.getElementById("instruction").style.fontSize = "20 px";
    }
}