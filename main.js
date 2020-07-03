

var camera, activeCamera, orthographicCamera, scene, renderer, controls;

//variables
var plane, world, physicsMaterial, timeStep = 1 / 60;
var stonesBody = [], stonesMesh = [], catapultsBody = [], catapultsMesh = [];
var standsBody = [],standsMesh =[],collidables =[];
var mainStandMesh,mainStandBody,mainStandSize;
var stats;
var xPositions =[-45,-30,-15,0,15];
var time = new Date();

var keyboard = new THREEx.KeyboardState();
var enemieNumber=0;
//shoot variables

var userShootVelocity = 4;

//window variables
window.addEventListener("keyup", function (e) {
    if(e.keyCode ==65){
        throwStone(catapultsBody[0],new THREE.Vector3(1,1,0),userShootVelocity);
    }
    if(e.keyCode == 32){
        positioningEnemies(1);
    }

});
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
    var groundBody = new CANNON.Body({mass: 0 ,material:physicsMaterial});
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.add(groundBody);



    //create stand for main catapult
    mainStandSize = new CANNON.Vec3(3,5,3);
    var mainStandShape = new CANNON.Box(mainStandSize);
    mainStandBody = new CANNON.Body({mass: 0 ,material :physicsMaterial});
    mainStandBody.addShape(mainStandShape);
    mainStandBody.position.set(-60,5,0);
    world.add(mainStandBody);


}

function init() {


    //var status
    stats = createStats();
    document.body.appendChild( stats.domElement );


    //making a scene
    scene = new THREE.Scene();
    //scene.fog = new THREE.FogExp2(0xffffff,0.08);

    //renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(new THREE.Color(0x000000));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('webgl').appendChild(renderer.domElement);


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

    //sky box
    var reflectionCube = new THREE.CubeTextureLoader()
        .setPath('texture/skybox4/')
        .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
    reflectionCube.format = THREE.RGBFormat;
    scene.background = reflectionCube;

    //stand  texture
    var mainStandTexture = new THREE.TextureLoader().load("texture/brick_stone_wall.jpg");
    mainStandTexture.repeat.set(1,1);
    mainStandTexture.wrapS = THREE.RepeatWrapping;
    mainStandTexture.wrapT = THREE.RepeatWrapping;
    mainStandTexture.magFilter = THREE.NearestFilter;
    mainStandTexture.minFilter = THREE.LinearMipMapLinearFilter;

    //stand mesh
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



    //create reusable game objects
    createStones();
    createCatapults();
    createStands();

    //setting default positions
    catapultsBody[0].position.set(mainStandBody.position.x,mainStandBody.position.y+mainStandSize.y + 1.6, mainStandBody.position.z);
    scene.add(catapultsMesh[0]);
    world.add(catapultsBody[0]);



    //lights
    var ambiantlight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambiantlight);

    //cameras
    camera = new THREE.PerspectiveCamera(
        100,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    var helper = new THREE.CameraHelper( camera );
    scene.add( helper );

    //orthographicCamera = new THREE.OrthographicCamera(window.innerWidth / -100, window.innerWidth / 100, window.innerHeight / 100, window.innerHeight / -100, 10, 1000);
   // camera.add(orthographicCamera);

    camera.position.x = -60;
    camera.position.y = 12;
    camera.position.z = 12;

    //setting default active camera
    activeCamera = camera;
    //adding orbit controls
    controls = new THREE.OrbitControls(activeCamera, renderer.domElement);

    //setting camera

    var look = new THREE.Vector3(-47,10,0);
    camera.lookAt(look);


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
    //update catapults
    for (let i = 0; i < catapultsBody.length; i++) {
        catapultsMesh[i].position.copy(catapultsBody[i].position);
        catapultsMesh[i].quaternion.copy(catapultsBody[i].quaternion);
    }
    for(let i = 0;i<standsBody.length;i++){
        standsMesh[i].position.copy(standsBody[i].position);
        standsMesh[i].quaternion.copy(standsBody[i].quaternion);
    }
}


function update() {

    //getting and showing the velocity
    if(keyboard.pressed('A')){
        if(userShootVelocity<50){
            document.getElementById("power").innerHTML ="power :"+ userShootVelocity ;
            userShootVelocity +=0.5;

        }
    }

 /*   if(Math.random()>0.95){
        for(let i=0 ; i<catapultsMesh.length; i++){
            checkCollison(catapultsMesh[i]);
        }
    }*/

    //update our scene here
    renderer.render(scene, camera);
    stats.update();
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
            /*world.remove(catapultsBody);
            scene.remove(catapultsMesh);
            world.remove(stonesBody[i]);
            scene.remove(stonesMesh[i]);
            */
            console.log("done");
        }
    }
}

function createCatapults() {

    for(let i = 0;i<5;i++){
        var catapultShape = new CANNON.Sphere(1.6);
        var catapultBody = new CANNON.Body({mass: 0});
        catapultBody.addShape(catapultShape);
        catapultsBody.push(catapultBody);

        //making mesh for our stone and add it to the scene and mesh array
        var catapultGeometry = new THREE.SphereGeometry(1.6);
        var material = new THREE.MeshPhongMaterial({color: 0x0000ff});
        var catapultMesh = new THREE.Mesh(catapultGeometry, material);
        catapultsMesh.push(catapultMesh);
    }
}
function createStands(){
    for(let i = 0;i<5;i++){
        var halfExt = new CANNON.Vec3(2,1,2);
        var standShape = new CANNON.Box(halfExt);
        var standBody = new CANNON.Body({mass: 0});
        standBody.addShape(standShape);
        standsBody.push(standBody);

        //making mesh for our stone and add it to the scene and mesh array
        var standGeometry = new THREE.BoxGeometry(halfExt.x*2,halfExt.y*2,halfExt.z*2);
        var material = new THREE.MeshPhongMaterial({color: 0x11bbff});
        var standMesh = new THREE.Mesh(standGeometry, material);
        standsMesh.push(standMesh);
    }
}

function createStones(){


    var stoneTexture = new THREE.TextureLoader().load("texture/stoneTexture1.jpg");
    stoneTexture.repeat.set(1,1);
    stoneTexture.wrapS = THREE.RepeatWrapping;
    stoneTexture.wrapT = THREE.RepeatWrapping;
    stoneTexture.magFilter = THREE.NearestFilter;
    stoneTexture.minFilter = THREE.LinearMipMapLinearFilter;
    for(let i =0;i<20;i++){

        //make a body for our stone and add it to body array
        var stoneShape = new CANNON.Sphere(0.6);
        var stoneBody = new CANNON.Body({mass: 80,material :physicsMaterial});
        stoneBody.addShape(stoneShape);
        stonesBody.push(stoneBody);

        //making mesh for our stone and add it to mesh array
        var stoneGeometry = new THREE.SphereGeometry(stoneShape.radius, 16, 16);
        var material = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            side:THREE.FrontSide,
            map:stoneTexture});
        var stoneMesh = new THREE.Mesh(stoneGeometry, material);

        stonesMesh.push(stoneMesh);
    }

}
function getNewPosition(index) {
    var position = new THREE.Vector3();
    var x = xPositions[index];
    var y =Math.floor(Math.random() * 20) +5;
    position.set(x,1.6+y,0);
    return position;
}
function positioningEnemies(number) {
    for(let i = 1;i<number+1;i++){
        var newPosition= getNewPosition(i);
        world.add(catapultsBody[i]);
        scene.add(catapultsMesh[i]);
        catapultsBody[i].position.copy(newPosition);
        world.add(standsBody[i]);
        scene.add(standsMesh[i]);
        standsBody[i].position.set(newPosition.x,newPosition.y-1.6-1,newPosition.z);
    }
    enemieNumber = number;
    setInterval(enemieAttack,3000);
}
function enemieAttack() {

    for(let i =1 ;i<enemieNumber+1;i++){
        if(catapultsBody[i].world===world){
            throwStone(catapultsBody[i],new THREE.Vector3(-1,1,0),Math.random()*15+9)
        }
    }

}

var countStones =0;

function throwStone(catapultBody,shootDirection,shootVelocity) {
    if(countStones>19){
        countStones = 0;
    }
    console.log(countStones);

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
    x += shootDirection.x * (5);
    y += shootDirection.y * (5);
    z += shootDirection.z * (5);

    stoneBody.position.set(x,y,z);
    stoneMesh.position.set(x,y,z);
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
}