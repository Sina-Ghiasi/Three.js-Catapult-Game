

var camera, activeCamera, orthographicCamera, scene, renderer, controls;
var phsyicRenderer = false;
var plane, world, mass, sphereBody, sphereShape, physicsMaterial, timeStep = 1 / 60;
var mainCatapult, mainCatapultMesh, stonesBody = [], stonesMesh = [], enemiesCatapultsBody = [], enemiesCatapultsMesh = [],shootingPlace;

var keyboard = new THREEx.KeyboardState();

var shootDirection = new THREE.Vector3();

var shootVelocity = {value:0.5};

//window variables


window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
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


    world.addContactMaterial(physicsContactMaterial);

    // Create a sphere
    var mass = 100, radius = 1.3;
    sphereShape = new CANNON.Sphere(radius);
    sphereBody = new CANNON.Body({mass: mass});
    sphereBody.addShape(sphereShape);
    sphereBody.position.set(-20, 1.3, 0);
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

    var skyBoxGeometry = new THREE.CubeGeometry(1000, 1000, 1000);
    var skyBoxMaterial = new THREE.MeshBasicMaterial({color: 0x9999ff, side: THREE.BackSide});
    var skyBox = new THREE.Mesh(skyBoxGeometry, skyBoxMaterial);

    shootingPlace = getSphere(1.3);
    var axesHelper = new THREE.AxesHelper( 10 );
    axesHelper.position.set(0,0,0);


    scene.add(skyBox);
    scene.add(axesHelper);
    scene.add(plane);
    scene.add(shootingPlace);

    //making our lights
    var ambiantlight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambiantlight);

    //making our camera
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );

    orthographicCamera = new THREE.OrthographicCamera(window.innerWidth / -100, window.innerWidth / 100, window.innerHeight / 100, window.innerHeight / -100, 10, 1000);
    camera.add(orthographicCamera);

    camera.position.x = 0;
    camera.position.y = 10;
    camera.position.z = 40;
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


    for (let i =0;i<1;i++ ){
        var postion = new THREE.Vector3(8,0,0);
        makeEnemyCatapult(postion);
    }

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
    for (let i = 0; i < stonesBody.length; i++) {
        stonesMesh[i].position.copy(stonesBody[i].position);
        stonesMesh[i].quaternion.copy(stonesBody[i].quaternion);
    }
    //update enemies catapults
    for (let i = 0; i < enemiesCatapultsBody.length; i++) {
        enemiesCatapultsMesh[i].position.copy(enemiesCatapultsBody[i].position);
        enemiesCatapultsMesh[i].quaternion.copy(enemiesCatapultsBody[i].quaternion);
    }
    shootingPlace.position.copy(sphereBody.position);

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
        /*    let i = 1;
            document.getElementById("hit").innerHTML = "hit : "+i;
            i++;
        */}
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
        var x = sphereBody.position.x;
        var y = sphereBody.position.y;
        var z = sphereBody.position.z;


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
        x += shootDirection.x * (sphereShape.radius*1.02 + stoneShape.radius);
        y += shootDirection.y * (sphereShape.radius*1.02 + stoneShape.radius);
        z += shootDirection.z * (sphereShape.radius*1.02 + stoneShape.radius);

        stoneBody.position.set(x,y,z);
        stoneMesh.position.set(x,y,z);

        sphereBody.position.set(-20,1.3,0);
        shootVelocity.value =0;


    }
}

window.addEventListener("keyup", throwStone);

