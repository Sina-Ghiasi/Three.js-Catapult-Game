
var camera,activeCamera,orthographicCamera , scene , renderer;

//window variables
var width = window.innerWidth;
var height = window.innerHeight;
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = width/ height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}


init();
function init() {




    //making a scene
    scene = new THREE.Scene();
    //scene.fog = new THREE.FogExp2(0xffffff,0.08);

    //making our scene objects
    var plane = getPlane(1024);
    var stone = geStone(2,2,2);
    stone.position.y =stone.geometry.parameters.height/2;
    scene.add(plane);
    scene.add(stone);

    //making our lights
    var ambiantlight =new THREE.AmbientLight(0xffffff,1);
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
    var controls = new THREE.OrbitControls(activeCamera,renderer.domElement);

    //using gui
    var gui = new dat.GUI();
    gui.add(ambiantlight,'intensity',0,10);
    gui.add(activeCamera.position,'z',-100,100);

    update(renderer,scene,activeCamera,controls);
}

function getPlane(size) {
    var geometry = new THREE.PlaneGeometry(size,size);
    var material = new THREE.MeshPhongMaterial({
        color: 0xabab1a,
        side:THREE.DoubleSide
    });
    var mesh = new THREE.Mesh(geometry,material);
    mesh.rotation.x =Math.PI/2;
    return mesh;

}

function geStone(w,h,d){
    var geometry = new THREE.BoxGeometry(w, h, d);
    var material = new THREE.MeshPhongMaterial({
        color: 0x00ff00
    });
    var mesh = new THREE.Mesh(geometry,material);
    return mesh;
}
function update(renderer ,scene ,camera ,controls) {
    //update our scene here
    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(function () {
        update(renderer ,scene,camera,controls);
    });
}