var SWARM_SIZE = 20;
var SPEED = 0.5;
var COM_RADIUS = 25;
var GRAVITY_RADIUS = 50;
var LEARN_RATE = 1;
var SHARE_RATE = 1;
var AMORTIGUATE = 1;
var MAX_LIFECYCLE = 25;
var mouse = {
    x: 0,
    y: 0
};

var swarm = new Array(); 

var circle;
var mouse_mark = new THREE.Vector3(0, 0, 0);

var stats = [];
var xPanel, xPanel2;

window.addEventListener('resize', onWindowResize, false);
document.addEventListener('mousemove', onMouseMove, false);


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.z = 500;

// GUI
var gui = new dat.GUI();
var cam = gui.addFolder('Camera');
cam.add(camera.position, 'z', 100, 1000).listen();
cam.open();

var renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});


renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


var geometry = new THREE.SphereGeometry(2, 16, 16);
var material = new THREE.ShaderMaterial({
    uniforms: {
        color1: {
            value: new THREE.Color("#5D8FF0")
        },
        color2: {
            value: new THREE.Color("#7645DC")
        }
    },
    vertexShader: `
            varying vec2 vUv;

            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
          `,
    fragmentShader: `
            uniform vec3 color1;
            uniform vec3 color2;

            varying vec2 vUv;

            void main() {

              gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
            }
          `,
    wireframe: true
});
var material_sub = new THREE.LineBasicMaterial({
    color: new THREE.Color("#A584E8")
});
/******************************************************************************************/
/******************************************************************************************/
/******************************************************************************************/
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

};
/******************************************************************************************/
function initStats() {
    for (var i = 0; i < 6; i++) {
        stats[i] = new Stats();
        stats[i].showPanel(i); // 0: fps, 1: ms, 2: mb, 3+: custom
        stats[i].dom.classList.add("stat");
        stats[i].dom.style.cssText = "";
        document.getElementById("stats").appendChild(stats[i].dom);
    }
    xPanel = stats[3].addPanel(new Stats.Panel('obj', '#ff8', '#221'));
    xPanel2 = stats[4].addPanel(new Stats.Panel('conv', '#ff8', '#a21'));
};
/******************************************************************************************/
function initSwarm() {
    for (var i = 0; i < SWARM_SIZE; i++) {

        var particle = new THREE.Mesh(geometry, material);
        particle.position.set(THREE.Math.randInt(-100, 100), THREE.Math.randInt(-100, 100), 0);
        particle.sid = 'particle';
        particle.lifecycle = 1;
        swarm.push(particle);
        particle.userData = {

            'v': new THREE.Vector3(THREE.Math.randFloat(-1, 1), THREE.Math.randFloat(-1, 1), 0), //Velocity
            'G': new THREE.Vector3(0, 0, 0),
            'e': new THREE.Vector3(0, 0, 0) //Error
        }
        scene.add(particle);
    }
};
/******************************************************************************************/
var distanceFit = function (one, two, param) {
    if (Math.abs(one.x - two.x) < param || Math.abs(one.y - two.y) < param) {
        return one.distanceTo(two);
    } else {
        return param * 2;
    }
};
/******************************************************************************************/
var countMeshes = function () {
    var numOfMeshes = 0;
    scene.traverse(function (child) {

        numOfMeshes++;
    });

    xPanel.update(numOfMeshes, 1000);
};
/******************************************************************************************/
var getError = function () {
    var count = 0;
    for (var i = 0; i < SWARM_SIZE; i++) {

        count += swarm[i].userData.e.length();
    }
    xPanel2.update(count * 1000, 50);
};
/******************************************************************************************/
var clean_scene = function () {
    var lines = [];
    scene.traverse(function (object) {
        object.lifecycle++;
        if (object.lifecycle > MAX_LIFECYCLE && (object.sid != 'particle')) {


            lines.push(scene.getObjectById(object.id, true));

        } else if (object instanceof THREE.Line) {
            lines.push(object);
        }
    });
    lines.forEach(function (object) {
        scene.remove(object)
    });
};
/******************************************************************************************/
var update_pos = function () {

    for (var i = 0; i < SWARM_SIZE; i++) {

        screeColision(swarm[i]);
        var temp = swarm[i].userData.G;

        temp.x -= swarm[i].userData.e.x / 2;
        temp.y -= swarm[i].userData.e.y / 2;

        swarm[i].userData.v.add(temp);
        swarm[i].translateOnAxis(swarm[i].userData.v, SPEED);

        let geometry = new THREE.SphereGeometry(1, 4, 4);
        var particle = new THREE.Mesh(geometry, material_sub);
        particle.position.set(swarm[i].position.x, swarm[i].position.y, swarm[i].position.z);
        particle.sid = 'sub_particle';
        particle.lifecycle = 1;
        scene.add(particle);
    }

};
/******************************************************************************************/
var init = function () {

    let geometry = new THREE.SphereGeometry(GRAVITY_RADIUS, 12, 12);
    circle = new THREE.Mesh(geometry, material);
    circle.name = "mouse_gravity_mark";

    circle.position.set(mouse_mark.x, mouse_mark.y, 0);
    scene.add(circle);

};
/******************************************************************************************/
var comunicate = function () {

    for (var i = 0; i < SWARM_SIZE - 1; i++) {
        for (var j = i + 1; j < SWARM_SIZE; j++) {
            if (distanceFit(swarm[i].position, swarm[j].position, COM_RADIUS) < COM_RADIUS) {
                var geometry = new THREE.Geometry();
                geometry.vertices.push(
                    swarm[i].position,
                    swarm[j].position
                );
                var line = new THREE.Line(geometry, material_sub);
                line.sid = 'link';
                scene.add(line);
            }
        }
    }
};
/******************************************************************************************/
function screeColision(particle) {

    var positionScreen = particle.position.clone().project(camera);
    positionScreen.setZ(0);

    if (positionScreen.x > 1 || positionScreen.x < -1)
        particle.userData.v.x = -particle.userData.v.x;
    if (positionScreen.y > 1 || positionScreen.y < -1)
        particle.userData.v.y = -particle.userData.v.y;
};
/******************************************************************************************/
function onMouseMove(event) {

    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    var dir = vector.sub(camera.position).normalize();
    var distance = -camera.position.z / dir.z;
    var pos = camera.position.clone().add(dir.multiplyScalar(distance));

    mouse_mark.x = pos.x;
    mouse_mark.y = pos.y;

    circle.position.set(mouse_mark.x, mouse_mark.y, 0);

};
/******************************************************************************************/
function gravity() {
    for (var i = 0; i < SWARM_SIZE; i++) {
        if (GRAVITY_RADIUS > distanceFit(mouse_mark, swarm[i].position, GRAVITY_RADIUS)) {

            var gravity = new THREE.Vector3();

            gravity.subVectors(mouse_mark, swarm[i].position);
            gravity.divideScalar(GRAVITY_RADIUS);

            swarm[i].userData.e.x = 0.25 * Math.abs(swarm[i].userData.e.x - gravity.x / GRAVITY_RADIUS);
            swarm[i].userData.e.y = 0.25 * Math.abs(swarm[i].userData.e.y - gravity.y / GRAVITY_RADIUS);

            var spherical = new THREE.Spherical();
            spherical.setFromVector3(gravity);
            spherical.radius = 1 - spherical.radius;
            var sub_gravity = new THREE.Vector3();
            sub_gravity.setFromSpherical(spherical);
            swarm[i].userData.G = sub_gravity;
        } else {
            swarm[i].userData.G = new THREE.Vector3(0, 0, 0);
        }
    }
};
/******************************************************************************************/
var animate = function () {

    for (var i = 0; i < 4; i++) stats[i].begin();

    requestAnimationFrame(animate);

    clean_scene();

    gravity();

    getError();

    comunicate();

    update_pos();

    countMeshes();

    //  renderer.clear();
    renderer.render(scene, camera);

    scene.dispose();

    for (var i = 0; i < 4; i++) stats[i].end();

};
/******************************************************************************************/

initSwarm();
init();
initStats();
animate();
