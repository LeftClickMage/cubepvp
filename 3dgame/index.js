import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from "https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js";
import CannonDebugger from 'https://cdn.jsdelivr.net/npm/cannon-es-debugger@1.0.0/+esm';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import Stats from 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/r17/Stats.min.js';
// import {RenderPass} from "three/addons/postprocessing/RenderPass";
// import {EffectComposer} from "three/addons/postprocessing/EffectComposer";


//// VARIABLES ////
// Ensure the socket is created only once
if (!window.socket) {
    window.socket = io();

    // window.socket.on('connect', () => {
    //     console.log('Connected to server with ID:', window.socket.id);
    // });

    // window.socket.on('updatePlayers', (players) => {
    //     console.log('Players updated:', players);
    // });

    // // Add other event listeners as needed
    // window.socket.on('disconnect', () => {
    //     console.log('Disconnected from server');
    // });
}

var scene = new THREE.Scene();
sceneSetup();
var renderer = new THREE.WebGLRenderer();
rendererSetup();
var physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -35, 0),
});
var velocity;
var forwardVector;
var rightVector;
var timeStep = 1/60;
var originalAngularFactor;
var cannonDebugger = new CannonDebugger(scene, physicsWorld, {color: 0xff0000});
var keys = {
    upArrow: false,
    downArrow: false,
    rightArrow: false,
    leftArrow: false,
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    leftShift: false,
}
var rotationX = -Math.PI/2;
var rotationY = 0;
var yAxis = new CANNON.Vec3(0, 1, 0);
var xAxis = new CANNON.Vec3(1, 0, 0);
var zAxis = new CANNON.Vec3(0, 0, 1);
var anim = true;
var noFrictionMaterial = new CANNON.Material();
var shadowsOn = true;
var degreeToRadian = Math.PI/180;











//// GAME CODE ////
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

var light = new THREE.DirectionalLight(0xfff7e0, 10);
light.position.set(50, 80, 10);

increaseLightShadowRange(light, 100, 2048);
var light2 = new THREE.AmbientLight(0xF0F0F0);

scene.add(light2, light);

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: memory
document.body.appendChild(stats.dom);

// if(anim){


//}


//// GAME OBJECTS ////
var leavesTime = {value: 0.0}
var leavesPositionsAmount = {value: 1};
var leavesPositions = { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] };
var leavesAnim = { value: true };

var leavesMaterial = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
});

leavesMaterial.defines.USE_UV = true;
leavesMaterial.needsUpdate = true;

//https://ycw.github.io/three-shaderlib-skim/dist/#/latest/standard/vertex
leavesMaterial.onBeforeCompile = (program) => {
    program.uniforms.uTime = leavesTime;
    program.uniforms.uAnim = leavesAnim;
    program.uniforms.uPositions = leavesPositions;
    program.uniforms.uAmount = leavesPositionsAmount;

    program.vertexShader = `
        uniform float uTime;
        uniform bool uAnim;
        uniform int uAmount;
        uniform vec3 uPositions[20];
    
    ` + program.vertexShader
        .replace("#include <project_vertex>", `
            vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
            vec4 prevGrassPos = mvPosition;

            if(uAnim){
                float bendFactor = mvPosition.y * mvPosition.y * 2.0;
                for(int i = 0; i<uAmount; i++){
                    float distanceToObject = length(mvPosition.xyz - uPositions[i]);
                    if(distanceToObject < 1.1){
                        if(uPositions[i].x > mvPosition.x){
                            mvPosition.x -= bendFactor;
                        } else if(uPositions[i].x < mvPosition.x){
                            mvPosition.x += bendFactor;
                        }
                        if(uPositions[i].z > mvPosition.z){
                            mvPosition.z -= bendFactor;
                        } else if(uPositions[i].z < mvPosition.z){
                            mvPosition.z += bendFactor;
                        }
                    } 
                }

                if (prevGrassPos == mvPosition && mvPosition.y > 0.1){
                    mvPosition.x += sin(mvPosition.y*mvPosition.y + uTime *7.0)/7.0;
                } 
            }

            mvPosition = modelViewMatrix * mvPosition;
            gl_Position = projectionMatrix * mvPosition;
        `)

    program.fragmentShader = program.fragmentShader
        .replace("#include <color_fragment>", `
            float clarity = vUv.y * vUv.y * 0.4 + 0.1;
            vec3 baseColor = vec3(0.41, 1.0, 0.5);
            diffuseColor.rgb *= baseColor * clarity;
        `)
}





const instanceNumber = 80000;
const dummy = new THREE.Object3D();

const geometry = new THREE.PlaneGeometry(0.1, 0.2);
geometry.translate( 0, 0.1, 0 ); // move grass blade geometry lowest point at 0.


const grass = new THREE.InstancedMesh( geometry, leavesMaterial, instanceNumber );
grass.frustumCulled = true;
grass.castShadow = true;
grass.receiveShadow = true;

scene.add( grass );


for (let i = 0; i < instanceNumber; i++) {
  const x = Math.random()*50-25;
  const z = Math.random()*50-25;
  const height = 1;
  const rotationY = Math.random() * Math.PI;

  dummy.position.set(x, 0, z);
  dummy.scale.setScalar(height);
  dummy.rotation.y = rotationY;
  dummy.updateMatrix();
  
  grass.setMatrixAt(i, dummy.matrix);
}













var platform = [
    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(20, 0.2, 20), 
            new THREE.MeshStandardMaterial({ color: 0x000000})
        ),
        body: new CANNON.Body({//starting platform
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(10, 0.1, 10)),
            material: noFrictionMaterial,
            position: new CANNON.Vec3(24+10, 7, 0)
        })
    },
    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.6, 4), 
            new THREE.MeshPhongMaterial({ color: 0x00F000, shininess: 100})
        ),
        body: new CANNON.Body({//respawn platform
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(2, 0.3, 2)),
            material: noFrictionMaterial,
            position: new CANNON.Vec3(0, 8, 0)
        })
    },
    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.2, 1), 
            new THREE.MeshStandardMaterial({ color: 0x000000})
        ),
        body: new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.1, 0.5)),
            material: noFrictionMaterial,
            position: new CANNON.Vec3(20, 2, 4)
        })
    },

    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.2, 1), 
            new THREE.MeshStandardMaterial({ color: 0x000000})
        ),
        body: new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.1, 0.5)),
            material: noFrictionMaterial,
            position: new CANNON.Vec3(20, 4, 6)
        })
    },
    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.2, 1), 
            new THREE.MeshStandardMaterial({ color: 0x000000})
        ),
        body: new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.1, 0.5)),
            material: noFrictionMaterial,
            position: new CANNON.Vec3(20, 6, 8)
        })
    },
];
platform.forEach((platform)=>{
    addToWorld(platform);
    platform.mesh.position.copy(platform.body.position);
})



var enemies = [];
addEnemy();
addEnemy();
addEnemy();
addEnemy();
addEnemy();


var playerModels = {};


var gltfLoader = new GLTFLoader();

function loadPlayerModel({path, size, name}){
    
    
    gltfLoader.load(path, (gltfScene)=>{
        
        gltfScene.scene.traverse(function(node){
            if ( node.isMesh ) {
                node.castShadow = true; 
                node.receiveShadow = true; 
            }
        })
       
       playerModels[name] = gltfScene.scene; 

        playerModels[name].position.set(0, -size/32, 0);
        playerModels[name].quaternion.setFromAxisAngle(yAxis, -90 * degreeToRadian);
        
       
    });
}


var loadedFirstModel = false;

loadPlayerModel({
    path: "assets/playerPistol.gltf", 
    name: "playerHoldingpistol",
    size: 16,
});

loadPlayerModel({
    path: "assets/playerShootingPistol.gltf", 
    name: "playerShootingpistol",
    size: 16,
});

loadPlayerModel({
    path: "assets/playersmg.gltf", 
    name: "playerHoldingsmg",
    size: 16,
});

loadPlayerModel({
    path: "assets/playerShootingsmg.gltf", 
    name: "playerShootingsmg",
    size: 16,
});


loadPlayerModel({
    path: "assets/playerHoldingar.gltf", 
    name: "playerHoldingar",
    size: 16,
});

loadPlayerModel({
    path: "assets/playerShootingar.gltf", 
    name: "playerShootingar",
    size: 16,
});


loadPlayerModel({
    path: "assets/playerHoldingsniper.gltf", 
    name: "playerHoldingsniper",
    size: 16,
});

loadPlayerModel({
    path: "assets/playerShootingsniper.gltf", 
    name: "playerShootingsniper",
    size: 16,
});


loadPlayerModel({
    path: "assets/playerHoldingshotgun.gltf", 
    name: "playerHoldingshotgun",
    size: 16,
});

loadPlayerModel({
    path: "assets/playerShootingshotgun.gltf", 
    name: "playerShootingshotgun",
    size: 16,
});


loadPlayerModel({
    path: "assets/playerDashing.gltf", 
    name: "playerDashing",
    size: 16,
});





var player = {
   mesh: new THREE.Group(),
    body: new CANNON.Body({
        mass: 10,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
        material: new CANNON.Material(),
        angularDamping: 0.3,
        position: new CANNON.Vec3(30, 10, 0),
        
    }),
    jumping: false,
    sprinting: false,
    canSprint: true,
    sprintingTimer: 0,
    speed: 7,
    canJump: false,
    canSuper: true,
    lookSpeed: 0.05,
    canShoot: true,
    fireRate: 400, 
    bulletSpeed: 50,
    gun: "pistol",
    score:0,
    highScore: 0,
    skin: "",
}


addToWorld(player);



var contactNormal = new CANNON.Vec3(); 
var upAxis = new CANNON.Vec3( 0, 1, 0 );
player.body.addEventListener( "collide", function (e) {
    player.body.angularFactor.set(0, 0, 0);
    var contact = e.contact;

    if (contact.bi == player.body) {
        contact.ni.negate( contactNormal );
    } 
    else {
        contactNormal.copy( contact.ni );
    }
    
    if ( contactNormal.dot( upAxis ) > 0.5) {
        touchingGround = true;
    }

    bullets.forEach((bullet)=>{
        if(contact.bi == bullet.body || contact.bj == bullet.body){
            if(player.mesh.position.x<24){
                killPlayer();
            }      
        }
    });
    
});


const loader = new FontLoader();


function createText({x, y, z, fontSize, color, rotateX, rotateY, rotateZ, textValue, displacementFactor, displaceFor}){
    loader.load('fonts/helvetica.typeface.json', function (font) {
        const text = new THREE.Mesh(
            new TextGeometry(textValue, {
                font: font,
                size: fontSize,
                height: fontSize/10,
                curveSegments: 1,
                bevelEnabled: true,
                bevelThickness: fontSize/30,
                bevelSize: fontSize/30,
                bevelOffset: 0,
                bevelSegments: 5,
            }), 
            new THREE.MeshStandardMaterial({
                color: color 
            })
        );
        text.geometry.computeBoundingBox();
        const width = text.geometry.boundingBox.max.x - text.geometry.boundingBox.min.x;
        if(displaceFor == "x"){
            text.position.set(x + width/2*displacementFactor, y, z);
        }else if(displaceFor == "y"){
            text.position.set(x, y + width/2*displacementFactor, z);
        } else if(displaceFor == "z"){
            text.position.set(x, y, z + width/2*displacementFactor);
        }
        
        text.castShadow = true;
        text.receiveShadow = true;
        text.rotation.set(rotateX * degreeToRadian, rotateY * degreeToRadian, rotateZ * degreeToRadian);
        scene.add(text);
    });
}


// Golden Oak (#DAA520)
// Light Oak (#D2B48C)
// Sandy Brown (#F4A460)
// Burlywood (#DEB887)
createText({
    x: 34,
    y: 10, 
    z: 23,
    color: 0xFFFFFF,
    fontSize: 3,
    rotateY: 180,
    rotateX: 0,
    rotateZ: 0,
    textValue: "CUBE PVP",
    displacementFactor: 1,
    displaceFor: "x",
});



createText({
    x: 34,
    y: 10, 
    z: -23,
    color: 0xFFFFFF,
    fontSize: 3,
    rotateY: 0,
    rotateX: 0,
    rotateZ: 0,
    textValue: "CUBE PVP",
    displacementFactor: -1,
    displaceFor: "x",
});

createText({
    x: 23,
    y: 9, 
    z: 0,
    color: 0xFF0000,
    fontSize: 1,
    rotateY: 90,
    rotateX: 0,
    rotateZ: 0,
    textValue: "PVP ZONE",
    displacementFactor: 1,
    displaceFor: "z",
});

createText({
    x: 23+22,
    y: 9, 
    z: 0,
    color: 0x00FF00,
    fontSize: 1,
    rotateY: 270,
    rotateX: 0,
    rotateZ: 0,
    textValue: "PRACTICE ZONE",
    displacementFactor: -1,
    displaceFor: "z",
});


function createPlayerNameTags({x, y, z, fontSize, color, rotateX, rotateY, rotateZ, textValue, id}){
    loader.load('fonts/helvetica.typeface.json', function (font) {
        const text = new THREE.Mesh(
            new TextGeometry(textValue, {
                font: font,
                size: fontSize,
                height: fontSize/10,
                curveSegments: 1,
                bevelEnabled: true,
                bevelThickness: fontSize/30,
                bevelSize: fontSize/30,
                bevelOffset: 0,
                bevelSegments: 5,
            }), 
            new THREE.MeshStandardMaterial({
                color: color 
            })
        );
        
    
        text.castShadow = true;
        text.receiveShadow = true;
        text.rotation.set(rotateX * degreeToRadian, rotateY * degreeToRadian, rotateZ * degreeToRadian);
        scene.add(text);
        playerNameTags[id] = text;
    });
}


var playerNameTags = {};





var ground = {
    mesh: new THREE.Mesh(
        new THREE.BoxGeometry(50, 50, 10), 
        new THREE.MeshStandardMaterial({ color: 0x005000 })
    ),
    body: new CANNON.Body({
        type: CANNON.Body.STATIC, 
        shape: new CANNON.Box(new CANNON.Vec3(25, 25, 5)),
        material: noFrictionMaterial,
        position: new CANNON.Vec3(0, -5, 0)
    }),
}
ground.body.quaternion.setFromEuler(-Math.PI/2, 0, 0);
addToWorld(ground);

var groundEnemy = {
    mesh: new THREE.Mesh(
        new THREE.BoxGeometry(50, 50, 10), 
        new THREE.MeshStandardMaterial({ color: 0x005000 })
    ),
    body: new CANNON.Body({
        type: CANNON.Body.STATIC, 
        shape: new CANNON.Box(new CANNON.Vec3(25, 25, 5)),
        material: noFrictionMaterial,
        position: new CANNON.Vec3(69, -5, 0)
    }),
}
groundEnemy.body.quaternion.setFromEuler(-Math.PI/2, 0, 0);
groundEnemy.mesh.quaternion.copy(groundEnemy.body.quaternion);
groundEnemy.mesh.position.copy(groundEnemy.body.position);
addToWorld(groundEnemy);


var walls = [
    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(50, 50, 4), 
            new THREE.MeshStandardMaterial({ color: 0x555555})
        ),
        body: new CANNON.Body({//Right wall
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(25, 25, 2)),
            material: noFrictionMaterial,
            position: new CANNON.Vec3(0, 25, -25 - 1)
        }),
    },
    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(50, 7, 4), 
            new THREE.MeshStandardMaterial({ color: 0x555555})
        ),
        body: new CANNON.Body({//back wall
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(25, 3.5, 2)),
            material: noFrictionMaterial,  
            position: new CANNON.Vec3(25+1, 3.5, 0)
        }),
    },
    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(50, 50, 4), 
            new THREE.MeshStandardMaterial({ color: 0x555555})
        ),
        body: new CANNON.Body({//left wall
            type: CANNON.Body.STATIC, 
            shape: new CANNON.Box(new CANNON.Vec3(25, 25, 2)),
            material: noFrictionMaterial,  
            position: new CANNON.Vec3(0, 25, 25+1)
        }),
    },
    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(50, 50, 4), 
            new THREE.MeshStandardMaterial({ color: 0x555555})
        ),
        body: new CANNON.Body({//front wall
            type: CANNON.Body.STATIC, 
            shape: new CANNON.Box(new CANNON.Vec3(25, 25, 2)),
            material: noFrictionMaterial, 
            position: new CANNON.Vec3(-25 - 1, 25, 0)
        }),
    },


    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(50, 50, 4), 
            new THREE.MeshStandardMaterial({ color: 0x555555})
        ),
        body: new CANNON.Body({//Right wall
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(25, 25, 2)),
            material: noFrictionMaterial,
            position: new CANNON.Vec3(0+70-2, 25, -25 - 1)
        }),
    },
    { //5
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(50, 7, 4), 
            new THREE.MeshStandardMaterial({ color: 0x555555})
        ),
        body: new CANNON.Body({//back wall
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(25, 3.5, 2)),
            material: noFrictionMaterial,  
            position: new CANNON.Vec3(25+20-3, 3.5, 0)
        }),
    },
    {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(50, 50, 4), 
            new THREE.MeshStandardMaterial({ color: 0x555555})
        ),
        body: new CANNON.Body({//left wall
            type: CANNON.Body.STATIC, 
            shape: new CANNON.Box(new CANNON.Vec3(25, 25, 2)),
            material: noFrictionMaterial,  
            position: new CANNON.Vec3(0+70-2, 25, 25+1)
        }),
    },
    { //7
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(50, 50, 4), 
            new THREE.MeshStandardMaterial({ color: 0x555555})
        ),
        body: new CANNON.Body({//front wall
            type: CANNON.Body.STATIC, 
            shape: new CANNON.Box(new CANNON.Vec3(25, 25, 2)),
            material: noFrictionMaterial, 
            position: new CANNON.Vec3(-25 - 1+50+70, 25, 0)
        }),
    },
];
walls.forEach((wall)=>{
    addToWorld(wall);
    wall.mesh.position.copy(wall.body.position);
});
walls[1].body.quaternion.setFromAxisAngle(yAxis, Math.PI/2);
walls[3].body.quaternion.setFromAxisAngle(yAxis, Math.PI/2);

walls[1].mesh.quaternion.copy(walls[1].body.quaternion);
walls[3].mesh.quaternion.copy(walls[3].body.quaternion);

walls[5].body.quaternion.setFromAxisAngle(yAxis, Math.PI/2);
walls[7].body.quaternion.setFromAxisAngle(yAxis, Math.PI/2);

walls[5].mesh.quaternion.copy(walls[1].body.quaternion);
walls[7].mesh.quaternion.copy(walls[3].body.quaternion);

var gameObjects = [];

var sphere = {
    mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 64, 64),
        new THREE.MeshStandardMaterial({color: 0xffff00,}),
    ), 
    body: new CANNON.Body({
        mass: 0,
        shape: new CANNON.Sphere(0.5),
        material: new CANNON.Material(),
        position: new CANNON.Vec3(3, 0.5, 0), 
        linearDamping: 0.3,
        angularDamping: 0.3,
    }),
}
addToWorld(sphere);
gameObjects.push(sphere);

createWall(10, 0, false);
createWall(10, 0, true);
createWall(-10, -10, false);
createWall(10, -18, false);
createWall(15, 15, false);
createWall(5, 5, false);
createWall(-5, -5, true);
createWall(-10, 15, true);
createWall(10, -15, true);
function createWall(x, z, value){

    createCrate(x, 1.5, z+1, value);
    createCrate(x+1, 1.5, z+1, value);
    createCrate(x-1, 1.5, z+1, value);

    createCrate(x, 0.5, z, value);
    createCrate(x+1, 0.5, z, value);
    createCrate(x-1, 0.5, z, value);

    createCrate(x, 1.5, z, value);
    createCrate(x+1, 1.5, z, value);
    createCrate(x-1, 1.5, z, value);

    createCrate(x+1, 2.5, z, value);
    createCrate(x-1, 2.5, z, value);

    createCrate(x+2, 0.5, z+1, value);
    createCrate(x-2, 0.5, z+1, value);
}


function createCrate(x, y, z, value){
    if(value){
        var temp = x;
        x = z;
        z = temp;
    }
    var crate = {
    mesh: new THREE.Group(),
    body: new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
        angularDamping: 0.3,
        position: new CANNON.Vec3(x, y, z),
        material: noFrictionMaterial,
        // angularFactor: new CANNON.Vec3(0, 0, 0),
    }),
    }
    loadSprite(crate.mesh, "model.gltf", 16);
    addToWorld(crate);
    gameObjects.push(crate);
}






loadContactMaterials();















//// TWEENS ////
var cameraOutTween = new TWEEN.Tween(camera)
    .to({ fov: 90 }, 210)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onComplete(() => {
    startSprintDelay();
    // consoleLog("complete" + player.sprinting);
});
var sprintDelay = 1500;
async function startSprintDelay(){
    player.sprinting = false;
HTMLObj("dashUI").style.background = "linear-gradient(to top, red, red)";
     for(let i = 1; i <=20; i++){
        HTMLObj("dashUI").style.height = i*5 + "px";
        await downtime(sprintDelay/20);
    }
HTMLObj("dashUI").style.background = "linear-gradient(to top, green, green)";
        HTMLObj("dashUI").style.height = "100px";
    player.canSprint = true;
}







function switchSkins(skinName){
    player.mesh.add(playerModels[skinName]);
    player.skin = skinName;
}


var grassUpdateVal = 0;
var bulletTimer = 0;
var bulletDelay = 5;
//// GAME RENDER ////
function renderGame() {
    
player.mesh.children.forEach(child => player.mesh.remove(child));

    
    
    
    if(player.gun == "pistol"){
        bulletDelay = 9;
    } else if(player.gun == "smg"){
        bulletDelay = 2;
    } else if (player.gun == "ar"){
        bulletDelay = 4;
    } else if (player.gun == "sniper"){
        bulletDelay = 19;
    } else if (player.gun == "shotgun"){
        bulletDelay = 11;
    }
    if(shotBullet){
        bulletDelay
        if(bulletTimer >= bulletDelay){
            shotBullet = false;
            bulletTimer = 0;
        }
        bulletTimer++;


        switchSkins("playerShooting" + player.gun);
    } else if (player.sprinting){
        switchSkins("playerDashing");
    } else if(playerModels["playerHolding" + player.gun]){
        switchSkins("playerHolding" + player.gun);
    }

    physicsWorld.step(timeStep);
    

    if(window.location.hostname == "localhost"){
        cannonDebugger.update();
    }



    originalAngularFactor = player.body.angularFactor.clone();

    
    player.body.quaternion.setFromAxisAngle(yAxis, -rotationX);

    


    setCameraPosition(5);
    
    updateEnemyMovement();
    
    
    updateMovement();
    
    checkForControllerInputs();
    

    updateShooting();
    
    
    

    camera.updateProjectionMatrix();

    ground.mesh.position.copy(ground.body.position);
    ground.mesh.quaternion.copy(ground.body.quaternion);
    player.mesh.position.copy(player.body.position);
    player.mesh.quaternion.copy(player.body.quaternion);
    renderGameObjects();
    checkForAiming();
    // composer.render();
    renderer.render(scene, camera);

    player.body.angularFactor.copy(originalAngularFactor);

    if(!player.canSuper && !runnedSuper){
        runnedSuper = true;
        delaySuper(10000);

    }
    if(!player.canShoot && !runned){
        runned = true;

        delayAndMakeTrue(player.fireRate);

    }
    HTMLObj("highScore").innerHTML = "HS: " + player.highScore;
    HTMLObj("score").innerHTML = "Score: " + player.score;
// consoleLog(bulletPool.length);
    HTMLObj("bulletPoolCount").innerHTML = "BulletPool: " + bulletPool.length;
   
    if(!runOnce){
        runOnce = true;
        populatePool();
        
    }

    window.socket.emit("updateMovement", ({
        x: player.body.position.x,
        y: player.body.position.y,
        z: player.body.position.z,
        quaternion: player.body.quaternion,
        forwardVector: forwardVector,
        gun: player.gun,
        skin: player.skin,
    }));

}
var runOnce = false;
var runned = false;
var runnedSuper = false;





















async function delaySuper(delay){
    HTMLObj("superUI").style.background = "linear-gradient(to top, red, red)";
    for(let i = 1; i <=5; i++){
        HTMLObj("superUI").style.height = i*20 + "px";
        await downtime(delay/5);
    }
HTMLObj("superUI").style.background = "linear-gradient(to top, green, green)";
    HTMLObj("superUI").style.height = "100px";
    player.canSuper = true;
    runnedSuper = false;
}

async function delayAndMakeTrue(delay){

    HTMLObj("shootUI").style.background = "linear-gradient(to top, red, red)";
    for(let i = 1; i <=5; i++){
        HTMLObj("shootUI").style.height = i*20 + "px";
        await downtime(delay/5);
    }
    HTMLObj("shootUI").style.height = "100px";
HTMLObj("shootUI").style.background = 'linear-gradient(to top, green, green)';
    player.canShoot = true;
    runned = false;
}
function calcCrosshairPos(bulletSpeed){
    return -0.12 * bulletSpeed + 37 + "%";
}

HTMLObj("switchPerformance").addEventListener("click", (e) => {
    var currentGraphicsValue = HTMLObj("graphicsValue").innerHTML;
    if(currentGraphicsValue == "ULTRA HIGH"){
        currentGraphicsValue = "LOW";
        grassShadows = false;
        grassShadowsChanger();
        shadowsOn = false;
        shadows(shadowsOn);
        
        anim = false;
    } else if(currentGraphicsValue == "MED"){
        currentGraphicsValue = "HIGH";
        
        shadowsOn = true;
        shadows(shadowsOn);
        grassShadows = false;
        grassShadowsChanger();
        grass.receiveShadow = true;
        anim = true;
    } else if(currentGraphicsValue == "LOW"){
        currentGraphicsValue = "MED";
        
        shadowsOn = true;
        shadows(shadowsOn);
        grassShadows = false;
        grassShadowsChanger();
        grass.receiveShadow = false;
        anim = true;
    } else if(currentGraphicsValue == "HIGH"){
        currentGraphicsValue = "ULTRA HIGH";
        grassShadows = true;
        grassShadowsChanger();
        shadowsOn = true;
        shadows(shadowsOn);
        anim = true;
    }
    
    HTMLObj("graphicsValue").innerHTML = currentGraphicsValue;
});


if(window.location.hostname == "localhost"){
    HTMLObj("debugTools").style.display="inline-block";
    HTMLObj("fireRateUpgrade").addEventListener("click", (e) => {
   if(player.fireRate > 100){
        player.fireRate -= 50;
    }
    consoleLog("fire rate: " + player.fireRate);
});
HTMLObj("bulletSpeedUpgrade").addEventListener("click", (e) => {
   if(player.bulletSpeed < 120){
        player.bulletSpeed += 10;
    }
    consoleLog("bullet speed: " + player.bulletSpeed);
});
}

function switchGunTo(gun){
    if (gun == "pistol" && player.gun !== "pistol"){
        player.bulletSpeed = 50;
        player.fireRate = 400;
        consoleLog("Pistol: 400 FR | 50 BS");
        HTMLObj("gunUI").innerHTML = "Pistol";
        player.gun = "pistol";
        HTMLObj("crosshair").style.top = "31%";
    } else if (gun == "ar" && player.gun !== "ar"){
        player.bulletSpeed = 75;
        player.fireRate = 200;
        consoleLog("AR: 200 FR | 75 BS");
        HTMLObj("gunUI").innerHTML = "AR";
        player.gun = "ar";
        HTMLObj("crosshair").style.top = "28%";
    } else if (gun == "smg" && player.gun !== "smg"){
        player.bulletSpeed = 50;
        player.fireRate = 100;
        consoleLog("SMG: 100 FR | 50 BS");
        HTMLObj("gunUI").innerHTML = "SMG";
        player.gun = "smg";
        HTMLObj("crosshair").style.top = "31%";
    } else if (gun == "sniper" && player.gun !== "sniper"){
        player.bulletSpeed = 120;
        player.fireRate = 700;
        consoleLog("Sniper: 700 FR | 120 BS");
        HTMLObj("gunUI").innerHTML = "Sniper";
        player.gun = "sniper";
        HTMLObj("crosshair").style.top = "25%";
    } else if (gun == "shotgun" && player.gun !== "shotgun"){
        player.bulletSpeed = 40;
        player.fireRate = 500;
        consoleLog("Shotgun: 500 FR | 40 BS");
        HTMLObj("gunUI").innerHTML = "Shotgun";
        player.gun = "shotgun";
        HTMLObj("crosshair").style.top = "31%";
    }
}



HTMLObj("pistol").addEventListener("click", (e) => {
    gunNumber = 1;
});
HTMLObj("ar").addEventListener("click", (e) => {
   gunNumber = 3;
});
HTMLObj("smg").addEventListener("click", (e) => {
   gunNumber = 2;
});
HTMLObj("sniper").addEventListener("click", (e) => {
   gunNumber = 4;
});
HTMLObj("shotgun").addEventListener("click", (e) => {
    gunNumber = 5;
});



var grassShadows = true;
function grassShadowsChanger(){
    grass.castShadow = grassShadows;
}

function addButtonListener(buttonID, objectID, type){
    HTMLObj(buttonID).addEventListener("click", (e) => {
        if(HTMLObj(objectID).style.display == type){
            HTMLObj(objectID).style.display = "none";
        } else {
            HTMLObj(objectID).style.display = type;
        }
    });
}



HTMLObj("switchGrass").addEventListener("click", (e) => {
    grassShadows = !grassShadows;
    grassShadowsChanger();


    if(grassShadows){
        HTMLObj("switchGrass").innerHTML = "Grass ON";
    } else if(!grassShadows){
        HTMLObj("switchGrass").innerHTML = "Grass OFF";
    }
  
});

addButtonListener("switchConsole", "consoleDiv", "inline-block");
addButtonListener("switchControls", "controlsText", "inline-block");


// document.getElementById('controlsText').style.display = 'flex';


HTMLObj("switchShadow").addEventListener("click", (e) => {
    shadowsOn = !shadowsOn;
    shadows(shadowsOn);
    if(shadowsOn){
        HTMLObj("switchShadow").innerHTML = "Shadows ON";
    } else if(!shadowsOn){
        HTMLObj("switchShadow").innerHTML = "Shadows OFF";
    }
  
});
HTMLObj("switchAnim").addEventListener("click", (e) => {
    anim = !anim;
    if(anim){
        HTMLObj("switchAnim").innerHTML = "Anims ON";
    } else if(!anim){
        HTMLObj("switchAnim").innerHTML = "Anims OFF";
    }
});

HTMLObj("consoleInput").addEventListener("keydown", (event)=>{
    if(event.key == "Enter"){
        if(HTMLObj("consoleInput").value){
            consoleLog(eval(HTMLObj("consoleInput").value));
            HTMLObj("consoleInput").value = "";
        }
    }
})


//// SHOOTING ////
var bullets = new Set();
var bulletPool = [];
var inPlayingField = false;
async function updateShooting(){
    bullets.forEach((bullet, index)=>{
        if(bullet.body.position.y < -10 || bullet.body.velocity.length()< 0.25){
            destroy(bullet);  
        }

        
        bullet.prevVelX = bullet.body.velocity.x;
        bullet.prevVelY = bullet.body.velocity.y;
        bullet.prevVelZ = bullet.body.velocity.z;
        bullet.mesh.position.copy(bullet.body.position);
        bullet.mesh.quaternion.copy(bullet.body.quaternion);
        
    });
    if(player.mesh.position.x < 45 && player.mesh.position.x > 23 && player.mesh.position.y > 5){
        inPlayingField = false;
    } else {
        inPlayingField = true;
    }
    if(keys.q && player.canShoot && inPlayingField && !player.sprinting){
        player.canShoot = false;
        shoot();
        shotBullet = true;
    }
    if(keys.e && player.canSuper && inPlayingField && !player.sprinting){
        player.canSuper = false;
        shootSuper();
    }

    
}

var shotBullet = false;
function createBullet(x, z, width, height, playerX, playerY, playerZ, quaternion){
    var bullet;
    if(bulletPool.length > 0){
        bullet = bulletPool.pop();
        bullet.body.wakeUp();
    } else {
        bullet = createSmallBullet();
    }
    // bullet.body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    bullet.body.position.set(playerX + x*2, playerY, playerZ + z*2);
    bullet.mesh.position.copy(bullet.body.position);
    bullet.mesh.quaternion.copy(bullet.body.quaternion);
    bullet.body.angularVelocity.set(0, 0, 0);
    bullet.body.angularFactor.set(0, 0, 0);
    addToWorld(bullet);
    bullets.add(bullet);
    bullet.prevVelX = x*50;
    bullet.prevVelY = 0.3;
    bullet.prevVelZ = z*50;
    bullet.body.velocity.set(bullet.prevVelX, bullet.prevVelY, bullet.prevVelZ);
    bullet.playerID = 1;

}
window.socket.on("playerSupered", ({x, y, z, quaternion, id})=>{
    if(id !== window.socket.id && x>44){

    } else {
        var superBulletSize = 0.05;
    createBullet(1, 0.75, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(-1, 0.75, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(-1, -0.75, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(1, -0.75, superBulletSize, superBulletSize, x, y, z, quaternion);

    createBullet(0.75, 1, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(-0.75, 1, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(-0.75, -1, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(0.75, -1, superBulletSize, superBulletSize, x, y, z, quaternion);

    createBullet(1, 1, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(-1, 1, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(-1, -1, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(1, -1, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(1, 0, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(0, 1, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(-1, 0, superBulletSize, superBulletSize, x, y, z, quaternion);
    createBullet(0, -1, superBulletSize, superBulletSize, x, y, z, quaternion);
    }
    
})
function shootSuper(){
    window.socket.emit("shotSuper");
}

function populatePool(){
    for(let i = 0; i < 30; i++){
        bulletPool.push(createSmallBullet());
    }
}


function shoot(){
    if(player.gun == "shotgun"){
        for(let i = 0; i<3; i++){
            var shellFactor;
            var bulletRotationVal = Math.PI/2;
            var shellRotation = Math.PI;

            var bullet;
            if(bulletPool.length > 0){
                bullet = bulletPool.pop();
                bullet.body.wakeUp();
            } else {
                bullet = createSmallBullet();
            }
            if(i == 1){
                shellRotation /= 25;
                bulletRotationVal *= 2/1.9;
            }
            if(i == 2){
                shellRotation /= -25;
                bulletRotationVal *= 2/2.1;
            }
            const additionalRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), shellRotation);
        bullet.body.position.set(player.body.position.x+ forwardVector.x*(i+1) -forwardVector.z/2, player.body.position.y, player.body.position.z+forwardVector.z*(i+1) + forwardVector.x/2);

            const resultQuaternion = new THREE.Quaternion().copy(player.body.quaternion).multiply(additionalRotation);

            bullet.body.quaternion.copy(resultQuaternion);
            
            addToWorld(bullet);
            bullets.add(bullet);
            var bulletVector = new THREE.Vector3(1, 0 ,0);
            bulletVector.applyQuaternion(player.body.quaternion);
            const bulletRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), bulletRotationVal);
            bulletVector.applyQuaternion(bulletRotation);
            bullet.prevVelX = bulletVector.x*player.bulletSpeed;
            bullet.prevVelY = 0.3;
            bullet.prevVelZ = bulletVector.z*player.bulletSpeed;
            bullet.body.velocity.set(bullet.prevVelX, bullet.prevVelY, bullet.prevVelZ);
            bullet.body.angularVelocity.set(0, 0, 0);
            bullet.body.angularFactor.set(0, 0, 0);

            window.socket.emit('getCurrentBulletID');
            bullet.id = bulletID;
            
        }
        window.socket.emit("updateBullets");
    } else {
        var bullet;
            if(bulletPool.length > 0){
                bullet = bulletPool.pop();
                bullet.body.wakeUp();
            } else {
                bullet = createSmallBullet();
            }

        bullet.body.position.set(player.body.position.x+ forwardVector.x -forwardVector.z/2, player.body.position.y, player.body.position.z+forwardVector.z + forwardVector.x/2);

            bullet.body.quaternion.copy(player.body.quaternion)
            
            addToWorld(bullet);
            bullets.add(bullet);

            bullet.prevVelX = forwardVector.x*player.bulletSpeed;
            bullet.prevVelY = 0.3;
            bullet.prevVelZ = forwardVector.z*player.bulletSpeed;
            bullet.body.velocity.set(bullet.prevVelX, bullet.prevVelY, bullet.prevVelZ);
            bullet.body.angularVelocity.set(0, 0, 0);
            bullet.body.angularFactor.set(0, 0, 0);
            window.socket.emit('getCurrentBulletID');
            bullet.id = bulletID;
            window.socket.emit("updateBullets");
    }


}
var bulletID = 0;
window.socket.on("currentBulletID", (bulletid)=>{
    bulletID = bulletid;
})

function createSmallBullet(){
    var bulletScale = 1.8;
    var bullet = {
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(0.05*bulletScale, 0.05*bulletScale, 0.5*bulletScale),
            new THREE.MeshStandardMaterial({ 
                color: 0x000000,
            }),
        ),
        body: new CANNON.Body({
            mass: 10,
            shape: new CANNON.Box(new CANNON.Vec3(0.05*bulletScale/2, 0.05*bulletScale/2, 0.5*bulletScale/2)),
            // angularDamping: 0.9,
            // linearDamping: 0.9,
            position: new CANNON.Vec3(player.body.position.x + forwardVector.x, player.body.position.y, player.body.position.z + forwardVector.z),
            quaternion: new THREE.Quaternion().copy(player.body.quaternion),
            ccdRadius: 1,
            ccdMotionThreshold: 1,
            material: noFrictionMaterial,
        }),
        prevVelX: forwardVector.x*player.bulletSpeed,
        prevVelY: 0.3,
        prevVelZ: forwardVector.z*player.bulletSpeed,
        id: 1,
        playerID: 0,
    }
    bullet.body.material.restitution = 0;
    bullet.body.material.friction = 0;
    bullet.body.addEventListener( "collide", async function (event) {
        destroy(bullet);      
    });
    return bullet;
}

function checkForAiming(){
    if(keys.leftShift && player.gun == "sniper"){
        camera.fov = 15;
        camera.lookAt(player.mesh.position.x, player.mesh.position.y+1.6, player.mesh.position.z);
        HTMLObj("crosshair").width = "25"*10;
        HTMLObj("crosshair").style.left = "57%";
        HTMLObj("crosshair").style.transform = "translate(-50%, -45%)";
        player.lookSpeed = 0.01;
        player.speed = 2;
    } else if(keys.leftShift && player.gun == "ar"){
        camera.fov = 45;
        camera.lookAt(player.mesh.position.x, player.mesh.position.y+0.8, player.mesh.position.z);
        HTMLObj("crosshair").width = "25"*3;
        HTMLObj("crosshair").style.left = "53%";
        HTMLObj("crosshair").style.transform = "translate(-50%, -35%)";
        player.lookSpeed = 0.03;
        player.speed = 5;
    }else {
        if(player.gun == "sniper"){
            HTMLObj("crosshair").width = "0";
        } else if (player.gun == "pistol" || player.gun == "smg"){
            HTMLObj("crosshair").width = "30";
        } else if (player.gun == "shotgun") {
            HTMLObj("crosshair").width = "50";
        } else {
            HTMLObj("crosshair").width = "25";
        }
        camera.fov = 75;
        camera.lookAt(player.mesh.position);
        
        HTMLObj("crosshair").style.left = "52%";
        HTMLObj("crosshair").style.transform = "translate(-50%, 0%)";
        player.lookSpeed = 0.05;
        player.speed = 7;
    }
}








//// ENEMY MOVEMENT ////
function updateEnemyMovement(){
    enemies.forEach((enemy)=>{
         const direction = new THREE.Vector3();
        direction.subVectors(player.mesh.position, enemy.mesh.position).normalize();

        var enemySpeed = 7;
        enemy.body.velocity.set(direction.x*enemySpeed, enemy.body.velocity.y, direction.z*enemySpeed);

        enemy.mesh.lookAt(player.mesh.position);

        enemy.mesh.position.copy(enemy.body.position);
        enemy.body.quaternion.copy(enemy.mesh.quaternion);        
        if(enemy.mesh.position.x < 43) {
            killEnemy(enemy);
        }
    })
}


//// PLAYER MOVEMENT ////
function renderGameObjects(){
    gameObjects.forEach((object)=>{
        object.mesh.position.copy(object.body.position);
        object.mesh.quaternion.copy(object.body.quaternion);
    })
}

function updateMovement() {
    
    
    if(player.body.position.y < -10 || player.body.position.y > 15){
        respawnPlayer();
    }
    checkIfCanJump();
    velocity = new THREE.Vector3();
    // Calculate the forward direction vector based on the object's orientation
    forwardVector = new THREE.Vector3(0, 0, -1);
    const quaternion = new THREE.Quaternion(player.body.quaternion.x, player.body.quaternion.y, player.body.quaternion.z, player.body.quaternion.w);
    forwardVector.applyQuaternion(quaternion);
var normalize = 1;
    if(keys.w && keys.a ||  keys.w && keys.d || keys.s && keys.a || keys.s && keys.d){
        normalize = Math.sqrt(player.speed*player.speed*2);
        normalize = normalize/2;
        normalize = normalize / player.speed;
    }
    if(!player.sprinting){
        if (keys.w || keys.s) {
        if (keys.w) {
            velocity.add(forwardVector.clone().multiplyScalar(player.speed*normalize));
        }
        if (keys.s) {
            velocity.add(forwardVector.clone().multiplyScalar(-player.speed*normalize));
        }
    }

    if (keys.a || keys.d) {
        rightVector = new THREE.Vector3(1, 0, 0);
        rightVector.applyQuaternion(quaternion);
        if (keys.a) {
            velocity.add(rightVector.clone().multiplyScalar(-player.speed*normalize));
        }
        if (keys.d) {
            velocity.add(rightVector.clone().multiplyScalar(player.speed*normalize));
        }
    }
    }

    
    if (player.canJump && player.jumping){
        player.body.velocity.y = 13;
        player.canJump = false;
        touchingGround = false;
    }
    if(player.sprinting){
        // consoleLog("ASDASD")
        
        velocity.add(forwardVector.clone().multiplyScalar(player.speed*5));
    } 

    if(keys.upArrow && !player.sprinting && player.canSprint && !keys.leftShift){
        player.canSprint = false;
        player.sprinting = true;
        cameraOutTween.start();

    }else if(camera.fov > 75 && !player.sprinting){
            cameraOutTween.stop();
            camera.fov -= 1.5;
 }
  
    // Set the velocity to the box body
    
    player.body.velocity.set(velocity.x, player.body.velocity.y, velocity.z);
}









var leavesOccupied = [true, false, false, false, false, false, false, false, false, false, false,false, false, false, false, false, false, false, false, false];
var otherPlayers = {}
var otherBullets = {}
var amountOfOtherPlayers = 0;

//// SERVER MANAGEMENT ////
window.socket.on('updatePlayers', (otherPlayersObject)=>{
    for(var id in otherPlayersObject){
        if(id == window.socket.id){
            continue;
        }
        var otherPlayer = otherPlayersObject[id];
        if(!otherPlayers[id]){
            otherPlayers[id] = {
                mesh: new THREE.Group(),
                body: new CANNON.Body({
                    mass: 0,
                    shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
                    material: new CANNON.Material(),
                    angularDamping: 0.3,
                    position: new CANNON.Vec3(30, 10, 0),
                    
                }),
                leavesID: amountOfOtherPlayers+1,
                playerSkins: {
                    "playerHoldingpistol": playerModels["playerHoldingpistol"].clone(),
                    "playerDashing": playerModels["playerDashing"].clone(),
                    "playerShootingpistol": playerModels["playerShootingpistol"].clone(),
                    
                    "playerHoldingsmg": playerModels["playerHoldingsmg"].clone(),
                    "playerShootingsmg": playerModels["playerShootingsmg"].clone(),
                     "playerHoldingar": playerModels["playerHoldingar"].clone(),
                    "playerShootingar": playerModels["playerShootingar"].clone(),
                     "playerHoldingsniper": playerModels["playerHoldingsniper"].clone(),
                    "playerShootingsniper": playerModels["playerShootingsniper"].clone(),
                     "playerHoldingshotgun": playerModels["playerHoldingshotgun"].clone(),
                    "playerShootingshotgun": playerModels["playerShootingshotgun"].clone(),
                }

            }

            createPlayerNameTags({
                x: otherPlayer.position.x,
                y: otherPlayer.position.y, 
                z: otherPlayer.position.z,
                color: 0xFFFFFF,
                fontSize: 0.3,
                rotateY: 180,
                rotateX: 0,
                rotateZ: 0,
                textValue: "Quest",
                id: id,
            });

            otherBullets[id] = {};
            addToWorld(otherPlayers[id]);
            amountOfOtherPlayers++;
            leavesOccupied[amountOfOtherPlayers] = true;
        } else {

            otherPlayers[id].mesh.children.forEach(child => otherPlayers[id].mesh.remove(child));
            if (otherPlayers[id].playerSkins[otherPlayer.skin] instanceof THREE.Object3D) {
    otherPlayers[id].mesh.add(otherPlayers[id].playerSkins[otherPlayer.skin]);
} else {
    consoleLog("NOT");
}

            if(otherPlayer.position.x < 44){
                otherPlayers[id].body.position.x = otherPlayer.position.x;
                otherPlayers[id].body.position.y = otherPlayer.position.y;
                otherPlayers[id].body.position.z = otherPlayer.position.z;
                otherPlayers[id].body.quaternion.copy(otherPlayer.quaternion);
            otherPlayers[id].body.angularFactor.set(0, 0, 0);
            otherPlayers[id].mesh.position.copy(otherPlayers[id].body.position);
            otherPlayers[id].mesh.quaternion.copy(otherPlayers[id].body.quaternion);
            


                    playerNameTags[id].position.copy(otherPlayers[id].mesh.position);
                    playerNameTags[id].geometry.computeBoundingBox();
                    const width = playerNameTags[id].geometry.boundingBox.max.x - playerNameTags[id].geometry.boundingBox.min.x;
                    playerNameTags[id].position.x += width/2 * forwardVector.z;
                    playerNameTags[id].position.z += width/2 * -forwardVector.x;
                    playerNameTags[id].position.y += 1;
                    playerNameTags[id].lookAt(camera.position);
                




                if(!leavesOccupied[otherPlayers[id].leavesID - 1]){
                    leavesOccupied[otherPlayers[id].leavesID - 1] = true;
                    leavesOccupied[otherPlayers[id].leavesID] = false;
                    otherPlayers[id].leavesID--;
                }
                leavesPositions.value[otherPlayers[id].leavesID].copy(otherPlayers[id].mesh.position);

                var virtualBulletArray = otherPlayer.bullets;
                for (var bullet_id in virtualBulletArray){
                    var virtualBullet = virtualBulletArray[bullet_id];
                    if(!otherBullets[id][bullet_id]){
                        otherBullets[id][bullet_id] = {exists: true}

                        shootOtherPlayerBullet({
                            x: otherPlayer.position.x,
                            y: otherPlayer.position.y,
                            z: otherPlayer.position.z,
                            forwardVector: otherPlayer.forwardVector,
                            bulletSpeed: calculateOtherPlayerBulletSpeed(otherPlayer.gun),
                            bullet_id: bullet_id,
                            player_id: id,
                            quaternion: otherPlayer.quaternion,
                            gun: otherPlayer.gun,
                        });
                    }

                }
            } else {
                otherPlayers[id].mesh.position.x = 0;
                otherPlayers[id].mesh.position.y = -8;
                otherPlayers[id].mesh.position.z = 0;
                otherPlayers[id].body.position.x = 0;
                otherPlayers[id].body.position.y = -8;
                otherPlayers[id].body.position.z = 0;
                playerNameTags[id].position.x = 0;
                playerNameTags[id].position.z = 0;
                playerNameTags[id].position.y = -8;
            }
        }
    }
    for (var id in otherPlayers){
        if(!otherPlayersObject[id]){
            physicsWorld.removeBody(otherPlayers[id].body);
            scene.remove(otherPlayers[id].mesh);

            if(amountOfOtherPlayers > 0){
                leavesOccupied[amountOfOtherPlayers] = false;
                amountOfOtherPlayers--;
            }
            removeMesh(playerNameTags[id]);
            delete playerNameTags[id];
            delete otherPlayers[id];
            
        }
    }
});










//// EXTRA FUNCTIONS ////
function removeMesh(mesh){
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
}

async function respawnPlayer(){
    await downtime(100);
    player.body.velocity.set(0, 0, 0);
    player.body.position.set(0, 11, 0);
    if(player.highScore < player.score){
        player.highScore = player.score;
    }
    player.score = 0;
    player.body.position.set(30, 10, 0);
    rotationX = -Math.PI/2;
    
}

function shootOtherPlayerBullet({x, y, z, quaternion, forwardVector, bulletSpeed, bullet_id, player_id, gun}){
    if(gun == "shotgun"){
        for(let i = 0; i<3; i++){
            var bulletRotationVal = Math.PI/2;
            var shellRotation = Math.PI;
            var bullet;
            if(bulletPool.length > 0){
                bullet = bulletPool.pop();
                bullet.body.wakeUp();
            } else {
                bullet = createSmallBullet();
            }
            if(i == 1){
                shellRotation /= 25;
                bulletRotationVal *= 2/1.9;
            }
            if(i == 2){
                shellRotation /= -25;
                bulletRotationVal *= 2/2.1;
            }
            const additionalRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), shellRotation);
            bullet.body.position.set(x+ forwardVector.x*(i+1) -forwardVector.z/2, y, z+forwardVector.z*(i+1) + forwardVector.x/2);
            const resultQuaternion = new THREE.Quaternion().copy(quaternion).multiply(additionalRotation);
            bullet.body.quaternion.copy(resultQuaternion)
            addToWorld(bullet);
            bullets.add(bullet);
            var bulletVector = new THREE.Vector3(1, 0 ,0);
            bulletVector.applyQuaternion(quaternion);
            const bulletRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), bulletRotationVal);
            bulletVector.applyQuaternion(bulletRotation);
            bullet.prevVelX = bulletVector.x*player.bulletSpeed;
            bullet.prevVelY = 0.3;
            bullet.prevVelZ = bulletVector.z*player.bulletSpeed;
            bullet.body.velocity.set(bullet.prevVelX, bullet.prevVelY, bullet.prevVelZ);
            bullet.body.angularVelocity.set(0, 0, 0);
            bullet.body.angularFactor.set(0, 0, 0);
            bullet.id = bullet_id;
            bullet.playerID = player_id;
        }
    } else {
        var bullet;
        if(bulletPool.length > 0){
            bullet = bulletPool.pop();
            bullet.body.wakeUp();
        } else {
            bullet = createSmallBullet();
        }
        bullet.id = bullet_id;
        bullet.playerID = player_id;
        addToWorld(bullet);
        bullets.add(bullet);
        bullet.body.position.set(x+ forwardVector.x -forwardVector.z/2, y, z+forwardVector.z + forwardVector.x/2);
        bullet.body.quaternion.copy(quaternion)
        bullet.prevVelX = forwardVector.x * bulletSpeed;
        bullet.prevVelY = 0.3;
        bullet.prevVelZ = forwardVector.z * bulletSpeed;
        bullet.body.velocity.set(bullet.prevVelX, bullet.prevVelY, bullet.prevVelZ);
        bullet.body.angularVelocity.set(0, 0, 0);
        bullet.body.angularFactor.set(0, 0, 0);
    }
}

function calculateOtherPlayerBulletSpeed(gun){
    if(gun == "pistol"){
        return 50;
    } else if(gun == "smg"){
        return 50;
    } else if(gun == "shotgun"){
        return 40;
    } else if(gun == "ar"){
        return 75;
    } else if(gun == "sniper"){
        return 120;
    }
}

function destroyObject(object) {

    scene.remove(object.mesh);
    object.mesh.geometry.dispose();
    object.mesh.material.dispose();
    if (object.mesh.material.map) {
        object.mesh.material.map.dispose();
    }
    physicsWorld.removeBody(object.body);
}

function shadows(value) {
    renderer.shadowMap.enabled = value;
    
    scene.traverse(function(object) {
        if (object.isMesh) {
            object.castShadow = value;
            object.receiveShadow = value;
        }
    });

    scene.children.forEach(function(child) {
        if (child.isLight) {
            child.castShadow = value;
        }
    });
}

async function killPlayer(){
    await downtime(100);
    player.body.velocity.set(0, 0, 0);
    player.body.position.set(0, 11, 0);
    if(player.highScore < player.score){
        player.highScore = player.score;
    }
    player.score = 0;
    player.body.position.set(0, 11, 0);
    rotationX = -Math.PI/2;
    
}

async function killEnemy(enemy){
    enemy.body.sleep();
    player.score += 50;
    enemy.body.position.set(Math.random() * 40 - 20+69, 5, Math.random() * 40 - 20);
    await downtime(1000);
    enemy.body.wakeUp();
}

function addEnemy(){
    var enemyScale = 1.2;
    var enemy = {
    mesh: new THREE.Mesh(
        new THREE.BoxGeometry(1*enemyScale, 1*enemyScale, 1*enemyScale),
        new THREE.MeshPhongMaterial({ 
            color: 0x0000FF,
        }),
    ),
    body: new CANNON.Body({
        mass: 10,
        shape: new CANNON.Box(new CANNON.Vec3(0.5*enemyScale, 0.5*enemyScale, 0.5*enemyScale)),
        angularDamping: 0.9,
        linearDamping: 0.9,
        position: new CANNON.Vec3(Math.random()*40-20+69, 3, Math.random()*40-20),
        material: new CANNON.Material(),
    }),
}

enemy.body.addEventListener("collide", function (e) {
    var contact = e.contact;
    bullets.forEach((bullet)=>{
        if(contact.bi == bullet.body || contact.bj == bullet.body){
            killEnemy(enemy);          
            if(player.gun !== "sniper"){
                destroy(bullet);
            }
            bullet.velocity.set(bullet.prevVelX, bullet.prevVelY, bullet.prevVelZ);
        }
    });
    if(contact.bi == player.body || contact.bj == player.body){
        respawnPlayer();
    }

}); 


addToWorld(enemy);
enemies.push(enemy);
}

function destroy(object) {
    
    if(bullets.has(object)){
        object.body.sleep();
        object.body.position.set(-40, 5, -40);
        object.mesh.position.copy(object.body.position);
        window.socket.emit("deleteBullets", ({
            id: object.id,
        }));
        bullets.delete(object);
        bulletPool.push(object);
    }
}

function HTMLObj(id){
    return document.getElementById(id);
}




var touchingGround = false;
function checkIfCanJump(){
    if(Math.abs(player.body.velocity.y)>3){
        player.canJump = false;
    } else if (touchingGround){
        player.canJump = true;
    }
}

function loadSprite(addMesh, path, height){
    var gltfLoader = new GLTFLoader();
    gltfLoader.load(path, (gltfScene)=>{
        gltfScene.scene.traverse(function(node){
            if ( node.isMesh ) {
                node.castShadow = true; 
                node.receiveShadow = true; 
            }
        })
        gltfScene.scene.position.set(0, -height/32, 0);
        addMesh.add(gltfScene.scene); 
    });
}

function addToWorld(container){
    physicsWorld.addBody(container.body);
    scene.add(container.mesh);
    container.mesh.receiveShadow = true;
    container.mesh.castShadow = true;
}

function increaseLightShadowRange(light, amount, shadowQuality){
    light.castShadow = true; //shadow
    light.shadow.camera.left = -amount;
    light.shadow.camera.right = amount;
    light.shadow.camera.top = amount;
    light.shadow.camera.bottom = -amount;
    light.shadow.mapSize.width = shadowQuality;
    light.shadow.mapSize.height = shadowQuality;
}
var atWall = false;
function setCameraPosition(distance){
    if(keys.rightArrow){
        rotationX += player.lookSpeed;
    }
    if(keys.leftArrow){
        rotationX -= player.lookSpeed;
    }

    var offsetX = Math.sin(-rotationX) * distance;
    var offsetY = Math.sin(rotationY) * distance;
    var offsetZ = Math.cos(-rotationX) * distance;
    if(camera.position.x < -23.5 || (camera.position.x > 23.5 && player.mesh.position.x < 24 && player.mesh.position.y < 6)){
        if(camera.position.x > 23.6){
            camera.position.x = 23.5001;
        } else if(camera.position.x < -23.6){
            camera.position.x = -23.5001;
        }
        if(Math.abs(player.mesh.position.x) + Math.abs(offsetX) > 23.5){
            atWall = true;
            camera.position.set(camera.position.x, player.mesh.position.y + offsetY+2.5, camera.position.z);
        } else {
             camera.position.set(player.mesh.position.x + offsetX, player.mesh.position.y + offsetY + 2.5, camera.position.z);
        }
    } else {
        atWall = false;
        camera.position.set(player.mesh.position.x + offsetX, player.mesh.position.y + offsetY + 2.5, camera.position.z);
    }

    if(Math.abs(camera.position.z) > 23.5){
        if(camera.position.z > 23.6){
            camera.position.z = 23.5001;
        } else if(camera.position.z < -23.6){
            camera.position.z = -23.5001;
        }

        if(Math.abs(player.mesh.position.z) + Math.abs(offsetZ) > 23.5){
            atWall = true;
            camera.position.set(camera.position.x, player.mesh.position.y + offsetY+2.5, camera.position.z);
        } else {
             camera.position.set(camera.position.x, player.mesh.position.y + offsetY + 2.5, player.mesh.position.z + offsetZ);
        }
    }else {
        
             camera.position.set(camera.position.x, player.mesh.position.y + offsetY + 2.5, player.mesh.position.z + offsetZ);
        }
    if (atWall){
        HTMLObj("crosshair").style.opacity = 0.4;
    } else if (!atWall){
        HTMLObj("crosshair").style.opacity = 1;
    }
    
}


function sceneSetup(){
    if(window.location.hostname == "localhost"){
        var axesHelper = new THREE.AxesHelper(8);
        scene.add(axesHelper);
    }
    scene.background = new THREE.Color(0x87CEEB);
}

function rendererSetup(){
    renderer.shadowMap.enabled = true; //shadow
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
}

function loadContactMaterials(){
    var groundSphereContactMaterial = new CANNON.ContactMaterial(
        ground.body.material,
        sphere.body.material,
        {restitution: 0.6}
    );
    
    var groundBoxContactMaterial = new CANNON.ContactMaterial(
        noFrictionMaterial,
        player.body.material,
        {friction: 0, restitution: 0}
    );
    enemies.forEach((enemy)=>{
        var enemyGround = new CANNON.ContactMaterial(
            ground.body.material,
            enemy.body.material,
            {friction: 0, restitution: 0}
        );
        physicsWorld.addContactMaterial(enemyGround);

    });


    physicsWorld.addContactMaterial(groundBoxContactMaterial);
    physicsWorld.addContactMaterial(groundSphereContactMaterial);
    
}

//// 60FPS RENDER ////
var fps, fpsInterval, startTime, now, then, elapsed;

function startAnimating(fps) {
    
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    // await downtime(1000);
    animate();
    
}

function animate(delta) {
    stats.begin()
    
    grassUpdateVal += 1/240;
    leavesTime.value = grassUpdateVal;
    leavesAnim.value = anim;
    // leavesMaterial.uniforms.anim.value = anim;

    // leavesMaterial..uTime.value = grassUpdateVal;
    // leavesMaterial.uniformsNeedUpdate = true;
    leavesPositionsAmount.value = amountOfOtherPlayers + 1;
    leavesPositions.value[0].copy(player.mesh.position);
    // leavesMaterial.uniforms.positions.value[0].copy(player.mesh.position);
    // leavesMaterial.uniforms.positions.value[1].copy(sphere.mesh.position);
    // leavesMaterial.uniforms.positions.value[2].copy(crate.mesh.position);
    // enemies.forEach((enemy, index)=>{
    //     leavesMaterial.uniforms.positions.value[index+3].copy(enemy.mesh.position);
    // })
    
    requestAnimationFrame(animate);
    now = Date.now();
    elapsed = now - then;
    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        TWEEN.update(delta);
        renderGame();
        
    }
    stats.end();
}


 startAnimating(60);


// }
function consoleLog(text){
    HTMLObj("console").innerHTML = "> " + text + "<br>" + HTMLObj("console").innerHTML;
}



//// EVENT LISTENERS ////
addEventListener('keydown', function(event) {
    // alert(event.key)
    // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
    var key = event.key.toLowerCase();
    if(key == "arrowright"){
        keys.rightArrow = true;
    }
    if(key == "arrowleft"){
        keys.leftArrow = true;
    }
    if(key == "arrowup"){
        keys.upArrow = true;
    }
    if(key == "arrowdown"){
        keys.downArrow = true;
    }
    if(key == "w"){
        // alert('test');
        keys.w = true;
    }
    if(key == "a"){
        keys.a = true;
    }
    if(key == "s"){
        keys.s = true;
    }
    if(key == "d"){
        keys.d = true;
    }
    if(key == "q"){
        keys.q = true;
    }
    if(key == "e"){
        keys.e = true;
    }
    if(key == " "){
        player.jumping = true;
    }
    if(key == "shift"){
        keys.leftShift = true;
    }
    if(key == "1"){
        gunNumber = 1;
    }
    if(key == "2"){
        gunNumber = 2;
    }
    if(key == "3"){
        gunNumber = 3;
    }
    if(key == "4"){
        gunNumber = 4;
    }
    if(key == "5"){
        gunNumber = 5;
    }
});
var gunNumber = 1;
addEventListener('keyup', function(event) {
    var key = event.key.toLowerCase();
    // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
    if(key == "arrowright"){
        keys.rightArrow = false;
    }
    if(key == "arrowleft"){
        keys.leftArrow = false;
    }
    if(key == "arrowup"){
        keys.upArrow = false;
    }
    if(key == "arrowdown"){
        keys.downArrow = false;
    }
    if(key == "w"){
        keys.w = false;
    }
    if(key == "a"){
        keys.a = false;
    }
    if(key == "s"){
        keys.s = false;
    }
    if(key == "d"){
        keys.d = false;
    }
    if(key == "q"){
        keys.q = false;
    }
    if(key == "e"){
        keys.e = false;
    }
    if(key == " "){
        player.jumping = false;
    }
    if(key == "shift"){
        keys.leftShift = false;
    }
});
var pressSwapped = false;
function checkForControllerInputs(){
    const controller = navigator.getGamepads()[0];
    if(controller){
        const leftJoystickX = controller.axes[0]; 
        const leftJoystickY = controller.axes[1]; 
        const rightJoystickX = controller.axes[2]; 
        const buttonA = controller.buttons[0].pressed; 
        const buttonY = controller.buttons[3].pressed; 
        const leftGun = controller.buttons[4].pressed; 
        const rightGun = controller.buttons[5].pressed; 
        if(leftGun && !pressSwapped){
            pressSwapped = true;
            gunNumber-= 1;
        } else if (rightGun && !pressSwapped){
            pressSwapped = true;
            gunNumber+=1;
        } else if(!leftGun && !rightGun){
            pressSwapped = false;
        }
        const aimTrigger = controller.buttons[6].pressed; 
        const shootTrigger = controller.buttons[7].pressed; 
        const leftJoystickPress = controller.buttons[10].pressed; 

        


        if(leftJoystickPress){
            keys.upArrow = true;
        } else if(!leftJoystickPress){
            keys.upArrow = false;
        }
        if(shootTrigger){
            keys.q = true;
        } else if(!shootTrigger){
            keys.q = false;
        }
        if(buttonY){
            keys.e = true;
        } else if(!buttonY){
            keys.e = false;
        }
        if(buttonA){
            player.jumping = true;
        } else if(!buttonA){
            player.jumping = false;
        }
        if(aimTrigger){
            keys.leftShift = true;
        } else if(!aimTrigger){
            keys.leftShift = false;
        }

        var deadZone = 0.25;
        if(leftJoystickX >= deadZone){
            keys.d = true;
        } else if(leftJoystickX <= -deadZone){
            keys.a = true;
        } else if(leftJoystickX < deadZone || leftJoystickX > -deadZone){
            keys.a = false;
            keys.d = false;
        }
        if(leftJoystickY >= deadZone){
            keys.s = true;
        } else if(leftJoystickY <= -deadZone){
            keys.w = true;
        } else if(leftJoystickY < deadZone || leftJoystickY > -deadZone){
            keys.s = false;
            keys.w = false;
        }
        if(rightJoystickX >= deadZone){
            keys.rightArrow = true;
        } else if(rightJoystickX <= -deadZone){
            keys.leftArrow = true;
        } else if(rightJoystickX < deadZone || rightJoystickX > -deadZone){
            keys.rightArrow = false;
            keys.leftArrow = false;
        }
        
    }
    if(gunNumber > 5){
        gunNumber = 1;
    } else if (gunNumber < 1){
        gunNumber = 5;
    }
    if(gunNumber == 1){
        switchGunTo("pistol");
    } else if(gunNumber == 2){
        switchGunTo("smg");
    } else if(gunNumber == 3){
        switchGunTo("ar");
    } else if(gunNumber == 4){
        switchGunTo("sniper");
    } else if(gunNumber == 5){
        switchGunTo("shotgun");
    } 
    makeBackgroundRed();
}

function makeEverythingWhite(){
    HTMLObj("pistol").style.backgroundColor = "white";
    HTMLObj("ar").style.backgroundColor = "white";
    HTMLObj("smg").style.backgroundColor = "white";
    HTMLObj("sniper").style.backgroundColor = "white";
    HTMLObj("shotgun").style.backgroundColor = "white";

}

function makeBackgroundRed(){
    if(gunNumber == 1){
        makeEverythingWhite();
        HTMLObj("pistol").style.backgroundColor = "red";
    } else if (gunNumber == 2){
        makeEverythingWhite();
        HTMLObj("smg").style.backgroundColor = "red";
    } else if (gunNumber == 3){
        makeEverythingWhite();
        HTMLObj("ar").style.backgroundColor = "red";
    } else if (gunNumber == 4){
        makeEverythingWhite();
        HTMLObj("sniper").style.backgroundColor = "red";
    } else if (gunNumber == 5){
        makeEverythingWhite();
        HTMLObj("shotgun").style.backgroundColor = "red";
    }
}

function downtime(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}