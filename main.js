import * as THREE from 'three';
import { OrbitControls } from 'three/orbit';

function main() {
    const ui_rules1 = document.querySelector("#ui_rules1");
    const ui_rules2 = document.querySelector("#ui_rules2");
    const ui_loop = document.querySelector("#ui_loop");
    const ui_generated_count = document.querySelector("#ui_generated_count");
    const ui_generated = document.querySelector("#ui_generated");
    const ui_axiom = document.querySelector("#ui_axiom");
    const ui_angle = document.querySelector("#ui_angle");
    const canvas = document.querySelector("#c");
    const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
    renderer.shadowMap.enabled = true;
    renderer.capabilities.maxSamples = 16;

    const fov = 60;
    const aspect = 2;
    const near = 0.1;
    const far = 2048;

    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = -200;
    camera.position.y = 300;

    const controls = new OrbitControls( camera, renderer.domElement);
    controls.minDistance = 128;
    controls.maxDistance = 2048;
    controls.target.set(0, 0, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xeeeeee );
    scene.fog = new THREE.Fog( 0xeeeeee, 248, 2048 );

    const ambient = new THREE.HemisphereLight( 0xeeeeee, 0x555555 );
    scene.add( ambient );

    const light = new THREE.SpotLight( 0xffffff, 1.5 );
    light.position.set( 0, 512, 128 );
    light.angle = Math.PI * 0.2;
    light.castShadow = true;
    light.shadow.camera.near = 64;
    light.shadow.camera.far = 1024;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    scene.add( light );

    const plane = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.ShadowMaterial( { color: 0x000000, opacity: 0.2 } ) );
    plane.rotateX( - Math.PI / 2 );
    plane.position.y = -1;
    plane.receiveShadow = true;
    scene.add( plane );

    const grid = new THREE.GridHelper( 8000, 800 );
    grid.position.y = 0;
    grid.material.opacity = 0.1;
    grid.material.transparent = true;
    scene.add( grid );

    const verts = [];
    let tween = new THREE.Vector3(0, 0, 0);
    function updateOrbitTarget() {
        // update camera target to bounding box center
        let center = new THREE.Vector3(0, 0, 0);
        let bounds = new THREE.BufferGeometry().setFromPoints(verts);
        bounds.computeBoundingBox();
        center.x = (bounds.boundingBox.max.x + bounds.boundingBox.min.x) / 2;
        center.y = (bounds.boundingBox.max.y + bounds.boundingBox.min.y) / 2;
        center.z = (bounds.boundingBox.max.z + bounds.boundingBox.min.z) / 2;
        tween.lerp(center, 0.001);
        controls.target.set(tween.x, tween.y, tween.z);
    }

    //////////////L-SYSTEMS/////////////////

    const axiom = "XX";
    const rules = {
        "X": "F+[[X]-X]-F[-FX]+X",
        "F": "FF"
    }

    const nests = 6;
    const length = 5;
    const angle = THREE.MathUtils.degToRad(90);

    let position = new THREE.Vector3();
    let direction = new THREE.Vector3(-length, 0, 0);
    const rotationAxis = new THREE.Vector3(0, 1, 0);

    const state = [];
    function processRule(rule) {
        if (rule == "F") {
            let newpos = position.clone().add(direction);
            const points = [position.clone(), newpos.clone()];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({color: 0xff0000});
            const line = new THREE.Line(geometry, material);
            setTimeout(() => {
                line.material.color.setHex(0x000000);
            }, 300);
            scene.add(line);
            verts.push(points[0], points[1]);
            position = newpos.clone();
        } else if (rule == "+") {
            direction.applyAxisAngle(rotationAxis, angle);
        } else if (rule == "-") {
            direction.applyAxisAngle(rotationAxis, -angle);
        } else if (rule == "[") {
            state.push( {pos: position.clone(), dir: direction.clone()} );
        } else if (rule == "]") {
            const old_state = state.pop();
            position.copy(old_state.pos.clone());
            direction.copy(old_state.dir.clone());
        }
    }

    // create a string of generated rules
    let generated = axiom;
    function generateNewBranch() {
        let string = "";
        for (let i = 0; i < generated.length; i++) {
            let c = generated[i];
            string += (rules[c] || c);
        }
        generated = string;
    }

    // generate all rules at once
    for (let i = 0; i < nests; i++)
        generateNewBranch();
    // for (let i = 0; i < nests; i++)
    //     generateNewBranch();

    // render each rule incrementally
    let index = 0;
    function renderRule() {
        if (index >= generated.length) {
            generateNewBranch();
        }
        if (index < generated.length) {
            processRule(generated[index]);
            ui_generated_count.innerHTML = index;
            ui_generated.innerHTML += generated[index];
            index++;
        }
        updateOrbitTarget();
    }

    // UI updates
    ui_rules1.innerHTML = rules["X"];
    ui_rules2.innerHTML = rules["F"];
    ui_axiom.innerHTML = axiom;
    ui_angle.innerHTML = Math.floor(THREE.MathUtils.radToDeg(angle)); // rad to deg
    ui_loop.innerHTML = nests;
    //////////////L-SYSTEMS/////////////////

    function updateResolution(renderer) {
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio; // might cost some performance
        const width = canvas.clientWidth * pixelRatio | 0;
        const height = canvas.clientHeight * pixelRatio | 0;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
        return needResize;
    }

    function render(time) {
        time *= 0.001;

        renderRule();
        controls.update();
        updateResolution(renderer);
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();