

var camera, activeCamera, orthographicCamera, scene, renderer, controls;

//variables
var plane, world, physicsMaterial, timeStep = 1 / 60;
var stonesBody = [], stonesMesh = [], enemiesCatapultsBody = [], enemiesCatapultsMesh = [];
var mainCatapultMesh,mainCatapultBody,mainStandMesh,mainStandBody,mainStandSize;


var keyboard = new THREEx.KeyboardState();

//shoot variables
var shootDirection = new THREE.Vector3();
var shootVelocity = {value:0.5};

//window variables
window.addEventListener("keyup", throwStone);
window.addEventListener('resize', onWindowResize, false);



initCannon();
init();
update();


function initCannon() {

    // Setup our world
    world = new CANNON.World();
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;
    var solver = new CANNON.GSSolver();
    solver.iterations = 7;
    solver.tolerance = 0.1;
    world.defaultContactMaterial.contactEquationStiffness = 1e9;
    world.defaultContactMaterial.contactEquationRelaxation = 4;
    var split = true;
    if (split)
        world.solver = new CANNON.SplitSolver(solver);
    else
        world.solver = solver;
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();

    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
        physicsMaterial,
        0.0, // friction coefficient
        0.3  // restitution
    );

    world.addContactMaterial(physicsContactMaterial);

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({mass: 0});
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.add(groundBody);



    //create stand for main catapult
    mainStandSize = new CANNON.Vec3(3,5,3);
    var mainStandShape = new CANNON.Box(mainStandSize);
    mainStandBody = new CANNON.Body({mass: 0});
    mainStandBody.addShape(mainStandShape);
    mainStandBody.position.set(-60,5,0);
    world.add(mainStandBody);


    // Create main catapult
    var mass = 100, radius = 1.3;
    mainCatapultShape = new CANNON.Sphere(radius);
    mainCatapultBody = new CANNON.Body({mass: mass});
    mainCatapultBody.addShape(mainCatapultShape);
    mainCatapultBody.position.set(mainStandBody.position.x,mainStandBody.position.y+mainStandSize.y + 1.3, mainStandBody.position.z);
    mainCatapultBody.linearDamping = 0.9;
    world.add(mainCatapultBody);

}

function init() {

    //making a scene
    scene = new THREE.Scene();
    //scene.fog = new THREE.FogExp2(0xffffff,0.08);


    //making our scene objects

    //plane texture
    var planeTexture = new THREE.TextureLoader().load("texture/Grass.jpg");
    planeTexture.repeat.set(20,20);
    planeTexture.wrapS = THREE.RepeatWrapping;
    planeTexture.wrapT = THREE.RepeatWrapping;
    planeTexture.magFilter = THREE.NearestFilter;
    planeTexture.minFilter = THREE.LinearMipMapLinearFilter;

    //plane mesh
    var geometry = new THREE.PlaneGeometry(512, 512);
    var material = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        side: THREE.BackSide,
        map:planeTexture,
        bumpMap:planeTexture,
        bumpScale :0.5
    });
    var plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = Math.PI / 2;
    scene.add(plane);

    //making sky box
    var reflectionCube = new THREE.CubeTextureLoader()
        .setPath('texture/skybox/')
        .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
    reflectionCube.format = THREE.RGBFormat;
    scene.background = reflectionCube;

    //making stand
    var mainStandTexture = new THREE.TextureLoader().load("texture/brick_stone_wall.jpg");
    mainStandTexture.repeat.set(1,1);
    mainStandTexture.wrapS = THREE.RepeatWrapping;
    mainStandTexture.wrapT = THREE.RepeatWrapping;
    mainStandTexture.magFilter = THREE.NearestFilter;
    mainStandTexture.minFilter = THREE.LinearMipMapLinearFilter;


    var mainStandGeometry = new THREE.BoxGeometry(mainStandSize.x*2,mainStandSize.y*2,mainStandSize.z*2);
    var mainStandmaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        side: THREE.FrontSide,
        map:mainStandTexture,
        bumpMap:mainStandTexture,
        bumpScale :0.5});

    mainStandMesh = new THREE.Mesh(mainStandGeometry,mainStandmaterial);
    mainStandMesh.position.copy(mainStandBody.position);
    scene.add(mainStandMesh);



    //making main catapult
    var mainCatapultGeometry = new THREE.SphereGeometry(1.3);
    var mainCatapultMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00
    });
    mainCatapultMesh = new THREE.Mesh(mainCatapultGeometry,mainCatapultMaterial);
    scene.add(mainCatapultMesh);

    //making some enemy

    for (let i =0;i<1;i++ ){
        var postion = new THREE.Vector3(8,0,0);
        makeEnemyCatapult(postion);

    }

    //making our lights
    var ambiantlight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambiantlight);

    //making our cameras
    camera = new THREE.PerspectiveCamera(
        100,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );

    orthographicCamera = new THREE.OrthographicCamera(window.innerWidth / -100, window.innerWidth / 100, window.innerHeight / 100, window.innerHeight / -100, 10, 1000);
    camera.add(orthographicCamera);

    camera.position.x = -32;
    camera.position.y = 11.8;
    camera.position.z = 21;
    camera.lookAt(scene.position);

    //setting default active camera
    activeCamera = camera;


    //making our renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(new THREE.Color(0x000000));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('webgl').appendChild(renderer.domElement);

    //adding orbit controls
    controls = new THREE.OrbitControls(activeCamera, renderer.domElement);


    //using gui
    var gui = new dat.GUI();
    var folder1 = gui.addFolder("camera and  light");
    folder1.add(ambiantlight, 'intensity', 0, 10);
    folder1.add(activeCamera.position, 'z', -200, 200);
    folder1.add(activeCamera.position, 'x', -200, 200);
    folder1.add(activeCamera.position, 'y', -200, 200);

}



function updatePhysics() {

    // Step the physics world
    world.step(timeStep);
    //update stones
    for (let i = 0; i < stonesBody.length; i++) {
        stonesMesh[i].position.copy(stonesBody[i].position);
        stonesMesh[i].quaternion.copy(stonesBody[i].quaternion);
    }
    //update enemies catapults
    for (let i = 0; i < enemiesCatapultsBody.length; i++) {
        enemiesCatapultsMesh[i].position.copy(enemiesCatapultsBody[i].position);
        enemiesCatapultsMesh[i].quaternion.copy(enemiesCatapultsBody[i].quaternion);
    }
    mainCatapultMesh.position.copy(mainCatapultBody.position);
    mainStandMesh.position.copy(mainStandBody.position);
    //update main catapult
    //mainCatapultMesh.position.copy(mainCatapult.position);
   // mainCatapultMesh.quaternion.copy(mainCatapult.quaternion);
}

function update() {

    //getting and showing the velocity
    if(keyboard.pressed('A')){
        if(shootVelocity.value<50){
            shootVelocity.value +=0.5;
            document.getElementById("power").innerHTML ="power :"+ shootVelocity.value ;

        }
    }

    for(let i=0 ;i<stonesMesh.length;i++){
        checkCollison(stonesMesh[i],enemiesCatapultsMesh);
    }
    //update our scene here
    renderer.render(scene, camera);
    updatePhysics();
    requestAnimationFrame(function () {
        update();
    });
}

function checkCollison(stoneMesh,collidableMeshList) {

    var originPoint = stoneMesh.position.clone();
    for (var vertexIndex = 0; vertexIndex < stoneMesh.geometry.vertices.length; vertexIndex++) {
        var localVertex = stoneMesh.geometry.vertices[vertexIndex].clone();
        var globalVertex = localVertex.applyMatrix4(stoneMesh.matrix);
        var directionVector = globalVertex.sub(stoneMesh.position);

        var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
        var collisionResults = ray.intersectObjects(collidableMeshList);
        if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()){
            console.log("hit");
        }
    }
}

function makeEnemyCatapult(vertexPosttion) {

    //make a body for our stone and add it to the world and body array

    var halfExtents = new CANNON.Vec3(2,2,2);
    var catapultShape = new CANNON.Box(halfExtents);
    var catapultBody = new CANNON.Body({mass: 100});
    catapultBody.addShape(catapultShape);
    catapultBody.position.set(vertexPosttion.x,vertexPosttion.y+halfExtents.y,vertexPosttion.z);
    enemiesCatapultsBody.push(catapultBody);
    world.add(catapultBody);

    //making mesh for our stone and add it to the scene and mesh array
    var catapultGeometry = new THREE.BoxGeometry(halfExtents.x*2,halfExtents.y*2,halfExtents.z*2);
    var material = new THREE.MeshPhongMaterial({color: 0xff00ff});
    var catapultMesh = new THREE.Mesh(catapultGeometry, material);
    catapultMesh.position.copy(catapultBody.position);
    enemiesCatapultsMesh.push(catapultMesh);
    scene.add(catapultMesh);

}
function throwStone(e) {

    if(e.keyCode ==65){

        //shooting coordinate
        var x = mainCatapultBody.position.x;
        var y = mainCatapultBody.position.y;
        var z = mainCatapultBody.position.z;


        //make a body for our stone and add it to the world and body array
        var stoneShape = new CANNON.Sphere(0.6);
        var stoneBody = new CANNON.Body({mass: 50});
        stoneBody.addShape(stoneShape);
        stonesBody.push(stoneBody);
        world.add(stoneBody);

        //making mesh for our stone and add it to the scene and mesh array
        var stoneGeometry = new THREE.SphereGeometry(stoneShape.radius, 32, 32);
        var material = new THREE.MeshPhongMaterial({color: 0xf000ff});
        var stoneMesh = new THREE.Mesh(stoneGeometry, material);
        stonesMesh.push(stoneMesh);
        scene.add(stoneMesh);

        //getShootDirection(shootDirection);
        shootDirection.set(0.5,0.5,0);

        stoneBody.velocity.set(
            shootDirection.x * shootVelocity.value,
            shootDirection.y * shootVelocity.value,
            shootDirection.z * shootVelocity.value);

        //positioning stone out of shooting place
        x += shootDirection.x * (mainCatapultShape.radius*1.02 + stoneShape.radius);
        y += shootDirection.y * (mainCatapultShape.radius*1.02 + stoneShape.radius);
        z += shootDirection.z * (mainCatapultShape.radius*1.02 + stoneShape.radius);

        stoneBody.position.set(x,y,z);
        stoneMesh.position.set(x,y,z);

        mainCatapultBody.position.set(mainStandBody.position.x,mainStandBody.position.y+mainStandSize.y + 1.3, mainStandBody.position.z);
        shootVelocity.value =0;


    }
}


function onWindowResize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}