var camera, activeCamera, orthographicCamera, scene, renderer, controls;
var phsyicRenderer = false;
var plane, world, mass, sphereBody, sphereShape, physicsMaterial, timeStep = 1 / 60;
var mainCatapult, mainCatapultMesh, stones = [], stonesMesh = [], enemiesCatapults = [], enemiesCatapultsMesh = [];


//window variables
var width = window.innerWidth;
var height = window.innerHeight;
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}


initCannon();
init();
update();


function initCannon() {
    // Setup our world
    world = new CANNON.World();
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;

    var solver = new CANNON.GSSolver();

    world.defaultContactMaterial.contactEquationStiffness = 1e9;
    world.defaultContactMaterial.contactEquationRelaxation = 4;

    solver.iterations = 7;
    solver.tolerance = 0.1;
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
    // We must add the contact materials to the world
    world.addContactMaterial(physicsContactMaterial);

    // Create a sphere
    var mass = 5, radius = 1.3;
    sphereShape = new CANNON.Sphere(radius);
    sphereBody = new CANNON.Body({mass: mass});
    sphereBody.addShape(sphereShape);
    sphereBody.position.set(0, 5, 0);
    sphereBody.linearDamping = 0.9;
    world.add(sphereBody);

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({mass: 0});
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.add(groundBody);
}

function init() {


    //making a scene
    scene = new THREE.Scene();
    //scene.fog = new THREE.FogExp2(0xffffff,0.08);

    //making our scene objects
    var plane = getPlane(1024);
    var shootingPlace = getSphere(1.3);
    shootingPlace.position = sphereBody.position;

    scene.add(plane);
    scene.add(shootingPlace);

    //making our lights
    var ambiantlight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambiantlight);

    //making our camera
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );

    orthographicCamera = new THREE.OrthographicCamera(width / -100, width / 100, height / 100, height / -100, 10, 1000);
    camera.add(orthographicCamera);

    camera.position.x = 2;
    camera.position.y = 3;
    camera.position.z = 15;
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
    folder1.add(activeCamera.position, 'z', -100, 100);

}


function getPlane(size) {
    var geometry = new THREE.PlaneGeometry(size, size);
    var material = new THREE.MeshPhongMaterial({
        color: 0xabab1a,
        side: THREE.DoubleSide
    });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    return mesh;

}

function getSphere(r) {
    var geometry = new THREE.SphereGeometry(r);
    var material = new THREE.MeshPhongMaterial({
        color: 0x00ff00
    });
    var mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

function updatePhysics() {

    // Step the physics world
    world.step(timeStep);
    //update stones
    for (let i = 0; i < stones.length; i++) {
        stonesMesh[i].position.copy(stones[i].position);
        stonesMesh[i].quaternion.copy(stones[i].quaternion);
    }
    //update enemies catapults
    for (let i = 0; i < enemiesCatapults.length; i++) {
        enemiesCatapultsMesh[i].position.copy(enemiesCatapults[i].position);
        enemiesCatapultsMesh[i].quaternion.copy(enemiesCatapults[i].quaternion);
    }
    //update main catapult
    //mainCatapultMesh.position.copy(mainCatapult.position);
   // mainCatapultMesh.quaternion.copy(mainCatapult.quaternion);
}

function update() {
    //update our scene here
    renderer.render(scene, camera);
    updatePhysics();
    requestAnimationFrame(function () {
        update();
    });
}

var shootDirection = new THREE.Vector3();

var shootVelo = {value:8};



function getShootDirection(targetVec){
    var vector = targetVec;

    targetVec.set(0,0.5,0.5);

    vector.unproject(activeCamera);

    var ray = new THREE.Ray(sphereBody.position, vector.sub(sphereBody.position).normalize() );

    targetVec.copy(ray.direction);

}

function throwStone() {

    //shooting coordinate
    var x = sphereBody.position.x;
    var y = sphereBody.position.y;
    var z = sphereBody.position.z;


    //make a body for our stone and add it to the world and body array
    var stoneShape = new CANNON.Sphere(0.2);
    var stoneBody = new CANNON.Body({mass: 50});
    stoneBody.addShape(stoneShape);
    stones.push(stoneBody);
    world.add(stoneBody);

    //making mesh for our stone and add it to the scene and mesh array
    var stoneGeometry = new THREE.SphereGeometry(stoneShape.radius, 32, 32);
    var material = new THREE.MeshPhongMaterial({color: 0xff00ff});
    var stoneMesh = new THREE.Mesh(stoneGeometry, material);
    stonesMesh.push(stoneMesh);
    scene.add(stoneMesh);

    //getShootDirection(shootDirection);
    shootDirection.set(0,0.5,0.5);

    stoneBody.velocity.set(
        shootDirection.x * shootVelo.value,
        shootDirection.y * shootVelo.value,
        shootDirection.z* shootVelo.value);

    //shooting stone
    x += shootDirection.x * (sphereShape.radius*1.02 + stoneShape.radius);
    y += shootDirection.y * (sphereShape.radius*1.02 + stoneShape.radius);
    z += shootDirection.z * (sphereShape.radius*1.02 + stoneShape.radius);

    stoneBody.position.set(x,y,z);
    stoneMesh.position.set(x,y,z);
    sphereBody.set(0,5,0);

}

window.addEventListener("click", throwStone);