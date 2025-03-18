// Game variables
let scene, camera, renderer, plane;
let score = 0;
let obstacles = [];
let clouds = [];
let gameOver = false;
let animationId;
let propeller;
let targets = [];
let bullets = []; // Array to store bullets
let lastShotTime = 0; // To control shooting rate
let lastGunIndex = 1; // 跟踪上次使用的机枪（0=左，1=右）
let leftGun, rightGun; // 存储机枪引用
let crosshair; // 瞄准镜对象
let audioContext; // 添加全局音频上下文
let cameraOrbit = 0; // 相机环绕角度
let cameraDistance = 10; // 相机与飞机的距离
let cameraHeight = 5; // 相机高度
let isMobile = false; // 是否为移动设备
let touchControls = null; // 触摸控制界面
let joystickSize = 100; // 虚拟摇杆大小
let joystickPosition = { x: 0, y: 0 }; // 虚拟摇杆位置
let joystickActive = false; // 虚拟摇杆是否激活
let shootButtonActive = false; // 射击按钮是否激活
let isDeviceTilting = false; // 设备是否正在倾斜(用于陀螺仪控制)
let lastTouchTime = 0; // 上次触摸时间，用于处理双击

// Controls
const keys = {
    ArrowUp: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    d: false,
    " ": false, // Space key for shooting
    "Shift": false, // Shift key for flying up
    "Control": false, // Control key for flying down
    "v": false, // 用于切换视角
    "q": false, // 用于左旋转视角
    "e": false  // 用于右旋转视角
};

// Game settings
const settings = {
    planeSpeed: 0.1,
    verticalSpeed: 0.08, // Speed for vertical movement
    obstacleSpeed: 0.2,
    cloudSpeed: 0.05,
    obstacleSpawnRate: 0.01,
    cloudSpawnRate: 0.02,
    maxObstacles: 20,
    maxClouds: 15,
    worldSize: 100,
    minAltitude: 1,    // Minimum flying height
    maxAltitude: 30,   // Maximum flying height
    scoreIncrement: 0, // 将自动得分设为0，只有击中目标才得分
    targetScore: 10,   // 击中目标得分
    propellerSpeed: 2.0,
    targetSpeed: 0.1,
    targetSpawnRate: 0.008,
    maxTargets: 10,
    bulletSpeed: 1.0,     // Speed of bullets
    shootingCooldown: 100, // Milliseconds between shots
    maxBullets: 50,       // Maximum number of bullets in the scene
    bulletLifetime: 2000,  // Milliseconds before bullet is removed
    aimAssistEnabled: true, // 启用瞄准辅助
    aimAssistAngle: 0.2,    // 瞄准辅助角度（弧度）
    soundEnabled: false,     // 声音开关控制
    cameraMode: 0,       // 相机模式: 0=跟随模式, 1=自由观察模式
    rotationSpeed: 0.02,  // 观察模式下的旋转速度
    mobileBulletSpread: 0.1, // 移动设备子弹扩散程度
    mobileAimAssistRange: 0.5, // 移动设备瞄准辅助范围
    simplifiedCollision: false // 简化碰撞检测（移动设备上启用）
};

// Initialize the game
function init() {
    // 检测是否为移动设备
    detectMobileDevice();
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // 添加视角切换提示（仅在非移动设备上显示）
    if (!isMobile) {
        addViewControls();
    }
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // 添加声音控制按钮
    addSoundControl();
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(settings.worldSize * 2, settings.worldSize * 2);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x228B22,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    scene.add(ground);
    
    // Create terrain features
    createTerrain();
    
    // Create plane
    createPlane();
    
    // Create crosshair (瞄准镜)
    createCrosshair();
    
    // Event listeners for all devices
    window.addEventListener('resize', handleResize);
    
    // PC/Desktop specific controls
    if (!isMobile) {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('wheel', handleMouseWheel);
    } else {
        // 移动设备控制
        createTouchControls();
        
        // 触摸事件
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);
        
        // 设备方向事件（如果支持）
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
        }
    }
    
    // Initialize audio after creating plane
    initAudio();
    
    // Start game loop
    animate();
}

// 处理鼠标滚轮事件
function handleMouseWheel(event) {
    // 仅在自由观察模式下调整相机距离
    if (settings.cameraMode === 1) {
        // event.deltaY 为正表示滚轮向下滚动，为负表示向上滚动
        cameraDistance += event.deltaY * 0.01;
        
        // 限制相机距离
        cameraDistance = Math.max(5, Math.min(cameraDistance, 30));
    }
}

// Create the player's plane
function createPlane() {
    // Create a simple plane model
    const geometry = new THREE.ConeGeometry(0.5, 2, 4);
    geometry.rotateX(-Math.PI / 2); // 将飞机朝向调整为向前方向
    
    const material = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
    plane = new THREE.Mesh(geometry, material);
    plane.position.set(0, 2, 0);
    
    // Add wings
    const wingGeometry = new THREE.BoxGeometry(3, 0.1, 0.5);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = 0.1;
    plane.add(wings);
    
    // Add tail
    const tailGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.z = -0.75;
    tail.position.y = 0.25;
    plane.add(tail);
    
    // 创建螺旋桨组
    const propellerGroup = new THREE.Group();
    propellerGroup.position.z = 1.1;
    
    // 创建螺旋桨轴心
    const hubGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 16);
    hubGeometry.rotateZ(Math.PI / 2);
    const hubMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2C3539,
        metalness: 0.9,
        roughness: 0.1
    });
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    propellerGroup.add(hub);
    
    // 创建螺旋桨叶片组
    propeller = new THREE.Group();
    
    // 创建三叶螺旋桨 (改为三叶更符合早期战斗机特征)
    const bladeCount = 3;
    
    // 使用更复杂的形状来创建螺旋桨叶片
    const bladeShape = new THREE.Shape();
    
    // 设计更精细的叶片形状（类似飞机螺旋桨的弧形）
    bladeShape.moveTo(0, 0);
    // 前缘
    bladeShape.bezierCurveTo(0.05, 0.1, 0.1, 0.3, 0.12, 0.7);
    // 顶部
    bladeShape.bezierCurveTo(0.11, 0.75, 0.09, 0.8, 0.07, 0.85);
    // 后缘
    bladeShape.bezierCurveTo(0.05, 0.8, 0.03, 0.6, 0, 0.9);
    // 左侧
    bladeShape.bezierCurveTo(-0.03, 0.6, -0.05, 0.8, -0.07, 0.85);
    bladeShape.bezierCurveTo(-0.09, 0.8, -0.11, 0.75, -0.12, 0.7);
    bladeShape.bezierCurveTo(-0.1, 0.3, -0.05, 0.1, 0, 0);
    
    const extrudeSettings = {
        steps: 2,
        depth: 0.02,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.02,
        bevelSegments: 5
    };
    
    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    const bladeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xD2B48C, // 木质颜色更符合老式飞机螺旋桨
        metalness: 0.3,
        roughness: 0.7,
        side: THREE.DoubleSide
    });
    
    // 添加多个叶片，均匀分布
    for (let i = 0; i < bladeCount; i++) {
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 0; // 从中心点开始
        
        // 计算每个叶片的旋转角度
        const angle = (i / bladeCount) * Math.PI * 2;
        blade.rotation.z = angle;
        
        // 添加螺旋桨扭转角度
        blade.rotation.x = Math.PI * 0.2; // 增加到20度的扭转角，更符合空气动力学
        
        // 添加纹理线条装饰，模拟木质纹理
        const lineGeometry = new THREE.BoxGeometry(0.005, 0.7, 0.005);
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8
        });
        
        for (let j = 0; j < 3; j++) {
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.position.x = -0.05 + j * 0.05;
            blade.add(line);
        }
        
        propeller.add(blade);
    }
    
    // 添加螺旋桨中心装饰盖
    const capGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16);
    capGeometry.rotateZ(Math.PI / 2);
    const capMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xB87333, // 铜色
        metalness: 0.8,
        roughness: 0.2
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.z = 0.09;
    
    // 添加装饰螺丝钉
    const boltGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.06, 8);
    boltGeometry.rotateX(Math.PI / 2);
    const boltMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.9,
        roughness: 0.1
    });
    
    // 添加6个装饰性螺丝钉
    for (let i = 0; i < 6; i++) {
        const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
        const angle = (i / 6) * Math.PI * 2;
        bolt.position.set(
            0.09 * Math.cos(angle),
            0.09 * Math.sin(angle),
            0.11
        );
        propellerGroup.add(bolt);
    }
    
    propellerGroup.add(cap);
    propellerGroup.add(propeller);
    plane.add(propellerGroup);
    
    // 增加螺旋桨旋转速度
    settings.propellerSpeed = 3.0;
    
    // Add machine guns on wings
    addMachineGuns(plane);
    
    scene.add(plane);
    
    // 添加螺旋桨音效，只在声音开启时执行
    if (settings.soundEnabled) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            propeller.sound = gainNode;
            propeller.audioContext = audioContext;
        } catch (e) {
            console.log('Audio not supported');
        }
    }
}

// Add machine guns to the plane
function addMachineGuns(plane) {
    // Left machine gun
    leftGun = createMachineGun();
    leftGun.position.set(-1.2, 0, 0.5);
    plane.add(leftGun);
    
    // Right machine gun
    rightGun = createMachineGun();
    rightGun.position.set(1.2, 0, 0.5);
    plane.add(rightGun);
}

// Create a machine gun
function createMachineGun() {
    const gunGroup = new THREE.Group();
    
    // Gun barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
    barrelGeometry.rotateX(Math.PI / 2);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.z = 0.25;
    gunGroup.add(barrel);
    
    // Gun mount
    const mountGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const mountMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const mount = new THREE.Mesh(mountGeometry, mountMaterial);
    gunGroup.add(mount);
    
    // 添加枪口闪光（默认不可见）
    const muzzleFlashGeometry = new THREE.ConeGeometry(0.1, 0.2, 8);
    muzzleFlashGeometry.rotateX(Math.PI / 2);
    const muzzleFlashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFF00, 
        transparent: true,
        opacity: 0.8
    });
    const muzzleFlash = new THREE.Mesh(muzzleFlashGeometry, muzzleFlashMaterial);
    muzzleFlash.position.z = 0.5; // 位于枪管前端
    muzzleFlash.visible = false; // 默认不可见
    muzzleFlash.name = 'muzzleFlash'; // 添加名称以便后续引用
    gunGroup.add(muzzleFlash);
    
    return gunGroup;
}

// Create a bullet
function createBullet() {
    const bulletGroup = new THREE.Group();
    
    // Main bullet
    const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bulletGroup.add(bullet);
    
    // Add tracer effect
    const tracerGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    tracerGeometry.rotateX(Math.PI / 2);
    const tracerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFF00,
        transparent: true,
        opacity: 0.6
    });
    const tracer = new THREE.Mesh(tracerGeometry, tracerMaterial);
    tracer.position.z = -0.4;
    bulletGroup.add(tracer);
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    bulletGroup.add(glow);
    
    // Use current gun
    const currentGun = lastGunIndex === 0 ? leftGun : rightGun;
    
    // Get gun world position and rotation
    const gunWorldPosition = new THREE.Vector3();
    const gunWorldQuaternion = new THREE.Quaternion();
    currentGun.getWorldPosition(gunWorldPosition);
    currentGun.getWorldQuaternion(gunWorldQuaternion);
    
    // Set bullet initial position and rotation
    bulletGroup.position.copy(gunWorldPosition);
    bulletGroup.quaternion.copy(gunWorldQuaternion);
    
    // Calculate bullet direction based on gun's world rotation
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(gunWorldQuaternion);
    
    // 在移动设备上添加一些随机偏移，使射击更容易命中
    if (isMobile && settings.mobileBulletSpread > 0) {
        // 添加随机扩散
        const spread = settings.mobileBulletSpread;
        direction.x += (Math.random() - 0.5) * spread;
        direction.y += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread * 0.5; // z轴扩散较小
        direction.normalize(); // 确保方向向量保持单位长度
    }
    
    // Store direction as a normalized vector
    bulletGroup.userData.direction = direction.normalize();
    bulletGroup.creationTime = Date.now();
    
    // Offset bullet position slightly forward
    bulletGroup.position.add(direction.multiplyScalar(0.5));
    
    scene.add(bulletGroup);
    bullets.push(bulletGroup);
}

// Shoot bullets
function shoot() {
    const currentTime = Date.now();
    
    // Check if enough time has passed since the last shot
    if (currentTime - lastShotTime > settings.shootingCooldown) {
        // 确定要使用的机枪
        lastGunIndex = 1 - lastGunIndex;
        const currentGun = lastGunIndex === 0 ? leftGun : rightGun;
        
        // 显示枪口闪光
        const muzzleFlash = currentGun.getObjectByName('muzzleFlash');
        if (muzzleFlash) {
            muzzleFlash.visible = true;
            
            // 0.1秒后隐藏闪光
            setTimeout(() => {
                muzzleFlash.visible = false;
            }, 100);
        }
        
        createBullet();
        lastShotTime = currentTime;
        
        // Play shooting sound
        playShootSound();
    }
}

// Play shooting sound
function playShootSound() {
    // 如果声音已禁用，直接返回
    if (!settings.soundEnabled) return;
    
    // Create a simple audio context and oscillator for a shooting sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Update bullets
function updateBullets() {
    const currentTime = Date.now();
    
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Use the stored direction for movement
        if (bullet.userData.direction) {
            const moveVector = bullet.userData.direction.clone().multiplyScalar(settings.bulletSpeed);
            bullet.position.add(moveVector);
        }
        
        // Rest of the collision checks and lifetime management...
        if (currentTime - bullet.creationTime > settings.bulletLifetime) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }
        
        if (
            Math.abs(bullet.position.x) > settings.worldSize / 2 ||
            Math.abs(bullet.position.z) > settings.worldSize / 2 ||
            bullet.position.y < -2 || bullet.position.y > 50
        ) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }
        
        const bulletBox = new THREE.Box3().setFromObject(bullet);
        for (let j = 0; j < targets.length; j++) {
            const targetBox = new THREE.Box3().setFromObject(targets[j]);
            
            if (bulletBox.intersectsBox(targetBox)) {
                scene.remove(bullet);
                bullets.splice(i, 1);
                
                scene.remove(targets[j]);
                targets.splice(j, 1);
                
                // 使用游戏设置中的目标得分值
                score += settings.targetScore;
                document.getElementById('score').textContent = 'Score: ' + Math.floor(score);
                
                createExplosion(targetBox.getCenter(new THREE.Vector3()));
                break;
            }
        }
    }
    
    if (bullets.length > settings.maxBullets) {
        const excessBullets = bullets.length - settings.maxBullets;
        for (let i = 0; i < excessBullets; i++) {
            scene.remove(bullets[i]);
        }
        bullets.splice(0, excessBullets);
    }
}

// Create explosion effect
function createExplosion(position) {
    // Create particle system for explosion
    const particleCount = 50; // 增加粒子数量
    const particles = new THREE.Group();
    
    // 爆炸中心光效
    const explosionLight = new THREE.PointLight(0xFF4500, 2, 5);
    explosionLight.position.copy(position);
    scene.add(explosionLight);
    
    // 爆炸中心球体
    const coreGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.copy(position);
    particles.add(core);
    
    // 爆炸粒子
    for (let i = 0; i < particleCount; i++) {
        // 随机选择粒子形状 - 有时是球体，有时是立方体
        let particleGeometry;
        if (Math.random() > 0.5) {
            particleGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.2, 4, 4);
        } else {
            particleGeometry = new THREE.BoxGeometry(0.1 + Math.random() * 0.2, 0.1 + Math.random() * 0.2, 0.1 + Math.random() * 0.2);
        }
        
        // 随机选择粒子颜色 - 红色、橙色或黄色
        const colors = [0xFF4500, 0xFF8C00, 0x700];
        const particleColor = colors[Math.floor(Math.random() * colors.length)];
        
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: particleColor,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(position);
        
        // Random direction
        particle.direction = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize();
        
        particle.speed = 0.5 + Math.random() * 0.5; // 增加粒子速度
        particle.rotationSpeed = Math.random() * 0.5; // 添加旋转
        particle.life = 30 + Math.floor(Math.random() * 20); // 随机生命周期
        
        particles.add(particle);
    }
    
    scene.add(particles);
    
    // 添加爆炸音效
    playExplosionSound();
    
    // Animate explosion
    function animateExplosion() {
        let allDead = true;
        
        // 爆炸中心光效淡出
        if (explosionLight.intensity > 0) {
            explosionLight.intensity -= 0.2;
            allDead = false;
        }
        
        // 爆炸中心球体缩小
        if (core.scale.x > 0.1) {
            core.scale.multiplyScalar(0.9);
            core.material.opacity *= 0.9;
            allDead = false;
        }
        
        particles.children.forEach(particle => {
            if (particle.life > 0) {
                // 移动粒子
                particle.position.add(particle.direction.clone().multiplyScalar(particle.speed));
                
                // 旋转粒子
                if (particle !== core && particle.rotationSpeed) {
                    particle.rotation.x += particle.rotationSpeed;
                    particle.rotation.y += particle.rotationSpeed;
                }
                
                // 粒子变小并淡出
                particle.scale.multiplyScalar(0.97);
                particle.material.opacity -= 0.02;
                particle.life--;
                allDead = false;
            }
        });
        
        if (allDead) {
            scene.remove(explosionLight);
            scene.remove(particles);
            return;
        }
        
        requestAnimationFrame(animateExplosion);
    }
    
    animateExplosion();
}

// 添加爆炸音效
function playExplosionSound() {
    // 如果声音已禁用，直接返回
    if (!settings.soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建噪声
        const bufferSize = 4096;
        const whiteNoise = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = whiteNoise.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = whiteNoise;
        
        // 创建滤波器
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, audioContext.currentTime);
        filter.Q.setValueAtTime(1, audioContext.currentTime);
        
        // 创建音量控制
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // 连接节点
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 播放声音
        noiseSource.start();
        noiseSource.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Create terrain features (rivers and mountains)
function createTerrain() {
    // Create a river
    const riverWidth = 5;
    const riverLength = settings.worldSize * 2;
    const riverGeometry = new THREE.PlaneGeometry(riverWidth, riverLength);
    const riverMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1E90FF,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const river = new THREE.Mesh(riverGeometry, riverMaterial);
    river.rotation.x = -Math.PI / 2;
    river.position.y = -1.9;
    river.position.x = settings.worldSize / 4;
    scene.add(river);
    
    // Create another river (perpendicular)
    const river2 = new THREE.Mesh(riverGeometry, riverMaterial);
    river2.rotation.x = -Math.PI / 2;
    river2.rotation.z = Math.PI / 2;
    river2.position.y = -1.9;
    river2.position.z = -settings.worldSize / 4;
    scene.add(river2);
    
    // Create mountains
    const mountainCount = 15;
    for (let i = 0; i < mountainCount; i++) {
        const mountainHeight = 3 + Math.random() * 7;
        const mountainRadius = 2 + Math.random() * 4;
        
        const mountainGeometry = new THREE.ConeGeometry(mountainRadius, mountainHeight, 8);
        const mountainMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            flatShading: true
        });
        
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        
        let x, z;
        do {
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * (settings.worldSize / 2 - 15);
            x = Math.cos(angle) * distance;
            z = Math.sin(angle) * distance;
        } while (Math.abs(x) < 10 && Math.abs(z) < 10);
        
        mountain.position.set(x, mountainHeight / 2 - 2, z);
        scene.add(mountain);
    }
}

// Create obstacles
function createObstacle() {
    const size = 1 + Math.random() * 2;
    const height = 2 + Math.random() * 5;
    
    const geometry = new THREE.BoxGeometry(size, height, size);
    const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown color for obstacles
    
    const obstacle = new THREE.Mesh(geometry, material);
    
    // Position the obstacle randomly around the world
    const angle = Math.random() * Math.PI * 2;
    const distance = settings.worldSize / 2 + Math.random() * 10;
    
    obstacle.position.x = Math.cos(angle) * distance;
    obstacle.position.y = height / 2 - 2; // Half height to place on ground
    obstacle.position.z = Math.sin(angle) * distance;
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

// Create clouds
function createCloud() {
    const cloudGroup = new THREE.Group();
    
    // Create several spheres to form a cloud
    const numPuffs = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numPuffs; i++) {
        const puffSize = 0.5 + Math.random() * 1;
        const geometry = new THREE.SphereGeometry(puffSize, 8, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8
        });
        
        const puff = new THREE.Mesh(geometry, material);
        puff.position.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 2
        );
        
        cloudGroup.add(puff);
    }
    
    // Position the cloud randomly in the sky
    const height = 5 + Math.random() * 10;
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * (settings.worldSize / 2);
    
    cloudGroup.position.x = Math.cos(angle) * distance;
    cloudGroup.position.y = height;
    cloudGroup.position.z = Math.sin(angle) * distance;
    
    scene.add(cloudGroup);
    clouds.push(cloudGroup);
}

// Create moving targets
function createTarget() {
    const targetGeometry = new THREE.SphereGeometry(1, 16, 16);
    const targetMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF4500,
        emissive: 0xFF4500,
        emissiveIntensity: 0.3
    });
    
    const target = new THREE.Mesh(targetGeometry, targetMaterial);
    
    // Position the target randomly in 3D space
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * (settings.worldSize / 2 - 15);
    
    target.position.x = Math.cos(angle) * distance;
    
    // Randomly decide if this target should be airborne
    const isAirborne = Math.random() < 0.4; // 40% chance to be in the air
    
    if (isAirborne) {
        // Place target at a random height between 2 and max altitude - 2
        target.position.y = 2 + Math.random() * (settings.maxAltitude - 4);
        // Add a property to track vertical movement
        target.verticalMovement = Math.random() < 0.5 ? 1 : -1;
        target.verticalSpeed = 0.02 + Math.random() * 0.04;
        target.minHeight = 2;
        target.maxHeight = settings.maxAltitude - 2;
    } else {
        // Ground target with slight hover
        target.position.y = 0;
    }
    
    target.position.z = Math.sin(angle) * distance;
    
    // Add random movement direction
    target.direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
    ).normalize();
    
    // Add a property to track if this is an airborne target
    target.isAirborne = isAirborne;
    
    scene.add(target);
    targets.push(target);
}

// Handle keyboard input
function handleKeyDown(event) {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
    }
}

function handleKeyUp(event) {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = false;
    }
}

// Handle window resize
function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update plane position based on controls
function updatePlane() {
    // 检查视角切换键
    if (keys.v) {
        // 只有在按键刚被按下时才切换，避免持续切换
        if (!plane.userData.viewKeyPressed) {
            toggleCameraMode();
            plane.userData.viewKeyPressed = true;
        }
    } else {
        plane.userData.viewKeyPressed = false;
    }
    
    // Forward movement only
    if (keys.ArrowUp || keys.w) {
        const moveDirection = new THREE.Vector3(0, 0, 1);
        moveDirection.applyQuaternion(plane.quaternion);
        plane.position.add(moveDirection.multiplyScalar(settings.planeSpeed));
    }
    
    // Turning mechanics
    if (keys.ArrowLeft || keys.a) {
        // Turn left
        plane.rotation.y += 0.03;
        plane.rotation.z = Math.min(plane.rotation.z + 0.05, 0.5); // Bank left
    } else if (keys.ArrowRight || keys.d) {
        // Turn right
        plane.rotation.y -= 0.03;
        plane.rotation.z = Math.max(plane.rotation.z - 0.05, -0.5); // Bank right
    } else {
        // Return to level flight
        if (plane.rotation.z > 0) {
            plane.rotation.z = Math.max(plane.rotation.z - 0.05, 0);
        } else if (plane.rotation.z < 0) {
            plane.rotation.z = Math.min(plane.rotation.z + 0.05, 0);
        }
    }
    
    // Up/down movement
    if (keys.Shift) {
        // Fly up
        plane.position.y += settings.verticalSpeed;
        plane.rotation.x = Math.max(plane.rotation.x - 0.03, -0.3); // Pitch up
    } else if (keys.Control) {
        // Fly down
        plane.position.y -= settings.verticalSpeed;
        plane.rotation.x = Math.min(plane.rotation.x + 0.03, 0.3); // Pitch down
    } else {
        // Return to level pitch
        if (plane.rotation.x > 0) {
            plane.rotation.x = Math.max(plane.rotation.x - 0.03, 0);
        } else if (plane.rotation.x < 0) {
            plane.rotation.x = Math.min(plane.rotation.x + 0.03, 0);
        }
    }
    
    // Enforce altitude limits
    plane.position.y = Math.max(
        Math.min(plane.position.y, settings.maxAltitude),
        settings.minAltitude
    );
    
    // Keep plane within world bounds
    const maxDistance = settings.worldSize / 2;
    plane.position.x = Math.max(Math.min(plane.position.x, maxDistance), -maxDistance);
    plane.position.z = Math.max(Math.min(plane.position.z, maxDistance), -maxDistance);
    
    // 根据当前模式更新相机位置
    updateCameraPosition();
}

// 更新相机位置
function updateCameraPosition() {
    if (settings.cameraMode === 0) {
        // 跟随模式 - 相机跟随飞机
        const cameraOffset = new THREE.Vector3(0, 3, -10);
        cameraOffset.applyQuaternion(plane.quaternion);
        camera.position.copy(plane.position).add(cameraOffset);
        camera.lookAt(plane.position);
    } else {
        // 自由观察模式 - 相机围绕飞机旋转
        
        // 处理相机旋转按键（仅限PC）
        if (!isMobile) {
            if (keys.q) {
                // 向左旋转相机 (逆时针)
                cameraOrbit += settings.rotationSpeed;
            } else if (keys.e) {
                // 向右旋转相机 (顺时针)
                cameraOrbit -= settings.rotationSpeed;
            }
            
            // 处理相机高度调整
            if (keys.ArrowUp && !keys.w) {
                // 向上移动相机
                cameraHeight += 0.2;
            } else if (keys.ArrowDown && !keys.s) {
                // 向下移动相机
                cameraHeight -= 0.2;
            }
        }
        
        // 限制相机高度
        cameraHeight = Math.max(1, Math.min(cameraHeight, 20));
        
        // 计算相机位置
        const x = plane.position.x + Math.sin(cameraOrbit) * cameraDistance;
        const z = plane.position.z + Math.cos(cameraOrbit) * cameraDistance;
        camera.position.set(x, plane.position.y + cameraHeight, z);
        
        // 使相机始终看向飞机
        camera.lookAt(plane.position);
    }
}

// Check for collisions
function checkCollisions() {
    // 简化的碰撞检测（用于移动设备或低性能模式）
    if (settings.simplifiedCollision) {
        checkSimplifiedCollisions();
        return;
    }
    
    const planeBox = new THREE.Box3().setFromObject(plane);
    
    // Check collisions with obstacles
    for (let i = 0; i < obstacles.length; i++) {
        const obstacleBox = new THREE.Box3().setFromObject(obstacles[i]);
        
        if (planeBox.intersectsBox(obstacleBox)) {
            handleGameOver();
            return;
        }
    }
    
    // Check collisions with targets
    for (let i = 0; i < targets.length; i++) {
        const targetBox = new THREE.Box3().setFromObject(targets[i]);
        
        if (planeBox.intersectsBox(targetBox)) {
            // Remove the target
            scene.remove(targets[i]);
            targets.splice(i, 1);
            i--;
            
            // Increase score
            score += settings.targetScore;
            document.getElementById('score').textContent = 'Score: ' + Math.floor(score);
        }
    }
}

// 简化的碰撞检测版本（用于移动设备）
function checkSimplifiedCollisions() {
    // 使用距离检测而不是完整的边界框，以提高性能
    const planePosition = plane.position.clone();
    const planeRadius = 1.5; // 简化的飞机半径
    
    // 检查障碍物碰撞
    for (let i = 0; i < obstacles.length; i++) {
        const obstaclePosition = obstacles[i].position.clone();
        // 根据障碍物类型估计半径
        const obstacleRadius = obstacles[i].geometry ? 
            Math.max(obstacles[i].geometry.parameters.width, obstacles[i].geometry.parameters.height) / 2 : 1;
        
        const distance = planePosition.distanceTo(obstaclePosition);
        
        if (distance < (planeRadius + obstacleRadius)) {
            handleGameOver();
            return;
        }
    }
    
    // 检查目标碰撞
    for (let i = 0; i < targets.length; i++) {
        const targetPosition = targets[i].position.clone();
        const targetRadius = 1; // 简化的目标半径
        
        const distance = planePosition.distanceTo(targetPosition);
        
        if (distance < (planeRadius + targetRadius)) {
            // 移除目标
            scene.remove(targets[i]);
            targets.splice(i, 1);
            i--;
            
            // 增加分数，使用设置中的目标得分值
            score += settings.targetScore;
            document.getElementById('score').textContent = 'Score: ' + Math.floor(score);
        }
    }
}

// 处理游戏结束
function handleGameOver() {
    gameOver = true;
    
    // 显示游戏结束消息
    const gameOverDiv = document.createElement('div');
    gameOverDiv.id = 'game-over';
    gameOverDiv.innerHTML = `
        <h2>Game Over!</h2>
        <p>Your score: ${Math.floor(score)}</p>
        <button id="restart-button">Restart Game</button>
    `;
    document.body.appendChild(gameOverDiv);
    
    // 添加重启按钮事件
    document.getElementById('restart-button').addEventListener('click', restartGame);
    
    // 停止动画循环
    cancelAnimationFrame(animationId);
    
    // 移动设备: 重置触摸控制
    if (isMobile) {
        resetJoystick();
    }
}

// Restart the game
function restartGame() {
    // Remove game over message
    const gameOverDiv = document.getElementById('game-over');
    if (gameOverDiv) {
        document.body.removeChild(gameOverDiv);
    }
    
    // Reset game variables
    score = 0;
    gameOver = false;
    
    // 为移动设备调整游戏设置
    if (isMobile) {
        // 重置触摸控制状态
        joystickActive = false;
        shootButtonActive = false;
        resetJoystick();
    }
    
    // Clear existing objects
    for (let i = obstacles.length - 1; i >= 0; i--) {
        scene.remove(obstacles[i]);
    }
    obstacles = [];
    
    for (let i = clouds.length - 1; i >= 0; i--) {
        scene.remove(clouds[i]);
    }
    clouds = [];
    
    for (let i = targets.length - 1; i >= 0; i--) {
        scene.remove(targets[i]);
    }
    targets = [];
    
    // Clear bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        scene.remove(bullets[i]);
    }
    bullets = [];
    
    // Reset plane position
    plane.position.set(0, 2, 0);
    plane.rotation.set(0, 0, 0);
    
    // Reset score display
    document.getElementById('score').textContent = 'Score: 0';
    
    // Restart animation
    animate();
}

// Update game state
function updateGame() {
    // Rotate propeller with enhanced effects
    if (propeller) {
        // 计算实际的飞机速度
        const planeSpeed = Math.sqrt(
            Math.pow(settings.planeSpeed, 2) * 
            ((keys.ArrowUp || keys.w || keys.ArrowDown || keys.s) ? 1 : 0)
        );
        
        const baseRotationSpeed = settings.propellerSpeed;
        const speedBoost = (keys.ArrowUp || keys.w) ? 1.5 : 1.0;
        // 增加加速变化的平滑度
        const currentSpeedRatio = plane.userData.currentSpeedRatio || 1.0;
        const targetSpeedRatio = speedBoost;
        // 平滑过渡到目标速度
        plane.userData.currentSpeedRatio = THREE.MathUtils.lerp(
            currentSpeedRatio, 
            targetSpeedRatio, 
            0.05
        );
        
        const finalRotationSpeed = baseRotationSpeed * plane.userData.currentSpeedRatio;
        
        // 应用旋转，添加微小随机抖动模拟真实引擎
        // 修改旋转轴为Z轴（正确的螺旋桨旋转方向）
        const vibration = (Math.random() - 0.5) * 0.02 * finalRotationSpeed;
        propeller.rotation.z += finalRotationSpeed + vibration;
        
        // 偶尔添加随机的轻微不规则性，模拟空气阻力和发动机功率波动
        if (Math.random() < 0.1) {
            // 10%几率发生轻微的速度波动
            propeller.rotation.z += (Math.random() - 0.3) * 0.1 * finalRotationSpeed;
        }
        
        // 应用运动模糊效果
        const blurFactor = plane.userData.currentSpeedRatio >= 1.2 ? 0.6 : 0.3;
        
        // 根据速度调整螺旋桨叶片的透明度和模糊效果
        propeller.children.forEach((blade, index) => {
            if (blade.material) {
                // 启用透明度
                blade.material.transparent = true;
                
                // 根据速度计算透明度
                const baseOpacity = 0.85; // 基础透明度
                const opacityReduction = plane.userData.currentSpeedRatio * blurFactor;
                const opacity = Math.max(0.3, baseOpacity - opacityReduction);
                
                blade.material.opacity = opacity;
                
                // 根据旋转位置调整每个叶片的透明度，模拟运动模糊
                // 使用Z轴旋转角度计算位置
                const angleOffset = (propeller.rotation.z + (index * Math.PI * 2 / propeller.children.length)) % (Math.PI * 2);
                const positionFactor = Math.abs(Math.sin(angleOffset));
                const additionalBlur = positionFactor * blurFactor * plane.userData.currentSpeedRatio;
                
                // 应用额外的位置相关模糊
                blade.material.opacity = Math.max(0.2, opacity - additionalBlur);
                
                // 调整材质的颜色，让快速旋转时略微发亮
                if (blade.material.emissive) {
                    const brightness = 0.1 + (plane.userData.currentSpeedRatio - 1) * 0.3;
                    blade.material.emissive.setRGB(brightness, brightness * 0.8, brightness * 0.6);
                }
                
                // 添加一点动态模糊拉伸效果（通过缩放）- 增加圆周方向的拉伸
                const stretchFactor = 1.0 + (additionalBlur * 0.3);
                const rotationAngle = propeller.rotation.z + (index * Math.PI * 2 / propeller.children.length);
                
                // 在高速时完全模糊成圆盘状
                if (plane.userData.currentSpeedRatio > 1.3) {
                    // 在高转速时，近似为圆盘形态，增强视觉上的速度感
                    blade.visible = index === 0; // 只显示一个叶片模拟整个圆盘
                    if (index === 0) {
                        // 创建圆盘状的模糊效果
                        const discOpacity = Math.min(0.7, plane.userData.currentSpeedRatio * 0.3);
                        blade.material.opacity = discOpacity;
                        blade.scale.set(1.3, 1.3, 1);
                    }
                } else {
                    // 中低速时，显示所有叶片并有透明度变化
                    blade.visible = true;
                    // 沿着旋转方向应用拉伸
                    blade.scale.set(1, stretchFactor, 1);
                }
                
                // 让线条（木质纹理）在高速旋转时几乎不可见
                if (blade.children && blade.children.length > 0) {
                    blade.children.forEach(line => {
                        if (line.material) {
                            line.material.transparent = true;
                            line.material.opacity = Math.max(0.1, 1 - (plane.userData.currentSpeedRatio - 1) * 1.5);
                        }
                    });
                }
            }
        });
        
        // 安全地调整音频
        try {
            if (settings.soundEnabled && propeller.sound && audioContext && propeller.oscillator) {
                const volume = 0.05 + (plane.userData.currentSpeedRatio - 1) * 0.2;
                const frequency = 150 + (plane.userData.currentSpeedRatio - 1) * 150;
                
                // 添加随机波动模拟真实引擎声音
                const randomPitch = (Math.random() - 0.5) * 10;
                
                propeller.sound.gain.setValueAtTime(volume, audioContext.currentTime);
                propeller.oscillator.frequency.setValueAtTime(frequency + randomPitch, audioContext.currentTime);
                
                // 如果有滤波器，调整滤波器频率以模拟发动机负载变化
                if (propeller.filter) {
                    const filterFreq = 800 + (plane.userData.currentSpeedRatio - 1) * 1200;
                    propeller.filter.frequency.setValueAtTime(filterFreq, audioContext.currentTime);
                }
                
                // 调整谐波振荡器
                if (propeller.harmonicOscillator) {
                    propeller.harmonicOscillator.frequency.setValueAtTime(
                        (frequency + randomPitch) * 2,
                        audioContext.currentTime
                    );
                }
                
                // 根据速度调整立体声效果，模拟螺旋桨声音随速度变化的空间感
                if (propeller.stereoNode) {
                    const stereoPan = Math.sin(Date.now() * 0.001 * plane.userData.currentSpeedRatio) * 0.2;
                    propeller.stereoNode.pan.setValueAtTime(stereoPan, audioContext.currentTime);
                }
            }
        } catch (e) {
            console.log('Audio adjustment failed:', e);
        }
    }
    
    // Handle shooting
    if (keys[" "] || shootButtonActive) {
        shoot();
    }
    
    // Update bullets
    updateBullets();
    
    // Spawn new obstacles
    if (obstacles.length < settings.maxObstacles && Math.random() < settings.obstacleSpawnRate) {
        createObstacle();
    }
    
    // Spawn new clouds
    if (clouds.length < settings.maxClouds && Math.random() < settings.cloudSpawnRate) {
        createCloud();
    }
    
    // Spawn new targets
    if (targets.length < settings.maxTargets && Math.random() < settings.targetSpawnRate) {
        createTarget();
    }
    
    // Move clouds
    for (let i = 0; i < clouds.length; i++) {
        clouds[i].position.x += (Math.random() - 0.5) * settings.cloudSpeed;
        clouds[i].position.z += (Math.random() - 0.5) * settings.cloudSpeed;
        
        // Remove clouds that go too far
        if (
            Math.abs(clouds[i].position.x) > settings.worldSize ||
            Math.abs(clouds[i].position.z) > settings.worldSize
        ) {
            scene.remove(clouds[i]);
            clouds.splice(i, 1);
            i--;
        }
    }
    
    // Move targets
    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        
        // Horizontal movement
        target.position.x += target.direction.x * settings.targetSpeed;
        target.position.z += target.direction.z * settings.targetSpeed;
        
        // Vertical movement for airborne targets
        if (target.isAirborne) {
            target.position.y += target.verticalMovement * target.verticalSpeed;
            
            // Reverse direction if reaching height limits
            if (target.position.y > target.maxHeight) {
                target.verticalMovement = -1;
            } else if (target.position.y < target.minHeight) {
                target.verticalMovement = 1;
            }
        } else {
            // Ground targets hover slightly
            target.position.y = Math.sin(Date.now() * 0.002 + i) * 0.3;
        }
        
        // Bounce off world boundaries
        const maxDistance = settings.worldSize / 2 - 5;
        if (Math.abs(target.position.x) > maxDistance || Math.abs(target.position.z) > maxDistance) {
            if (Math.abs(target.position.x) > maxDistance) {
                target.direction.x *= -1;
                target.position.x = Math.sign(target.position.x) * maxDistance;
            }
            if (Math.abs(target.position.z) > maxDistance) {
                target.direction.z *= -1;
                target.position.z = Math.sign(target.position.z) * maxDistance;
            }
        }
    }
    
    // Update score
    score += settings.scoreIncrement;
    document.getElementById('score').textContent = 'Score: ' + Math.floor(score);
    
    // 添加空气动力学特效
    if (plane.userData.currentSpeedRatio > 1.3) {
        // 当速度足够高时，添加气流效果（如跟随在螺旋桨后面的气流线）
        createPropellerAirEffect();
    }
    
    // 更新螺旋桨圆盘效果
    if (propeller && propeller.disc) {
        // 更新圆盘透明度，在高速时可见
        const discOpacity = Math.max(0, (plane.userData.currentSpeedRatio - 1.1) * 0.7);
        propeller.disc.material.opacity = discOpacity;
        
        // 旋转圆盘，确保它总是正对相机
        propeller.disc.lookAt(camera.position);
        
        // 在高速时添加一些圆盘的颜色/发光效果
        if (plane.userData.currentSpeedRatio > 1.3) {
            const hue = (Date.now() % 1000) / 1000; // 循环色相
            const lightness = 0.5 + 0.2 * Math.sin(Date.now() * 0.005); // 亮度波动
            propeller.disc.material.color.setHSL(hue, 0.3, lightness);
            
            // 仅在高速时显示圆盘
            propeller.disc.visible = true;
        } else {
            propeller.disc.visible = discOpacity > 0.05;
        }
    }
}

// Create crosshair (瞄准镜)
function createCrosshair() {
    // 创建一个新的场景用于渲染瞄准镜
    crosshair = new THREE.Scene();
    
    // 创建瞄准镜的十字线
    const crosshairSize = 0.05;
    const lineWidth = 0.004;
    const crosshairColor = 0xFF0000;
    
    // 水平线
    const horizontalGeometry = new THREE.PlaneGeometry(crosshairSize, lineWidth);
    const crosshairMaterial = new THREE.MeshBasicMaterial({ 
        color: crosshairColor,
        transparent: true,
        opacity: 0.8,
        depthTest: false
    });
    const horizontalLine = new THREE.Mesh(horizontalGeometry, crosshairMaterial);
    horizontalLine.name = 'crosshairPart';
    crosshair.add(horizontalLine);
    
    // 垂直线
    const verticalGeometry = new THREE.PlaneGeometry(lineWidth, crosshairSize);
    const verticalLine = new THREE.Mesh(verticalGeometry, crosshairMaterial);
    verticalLine.name = 'crosshairPart';
    crosshair.add(verticalLine);
    
    // 创建锁定框（由四个角组成）
    const cornerSize = 0.02;
    const cornerWidth = 0.003;
    const lockBoxSize = 0.08;
    
    // 创建四个角
    const corners = [];
    for (let i = 0; i < 4; i++) {
        const cornerGroup = new THREE.Group();
        
        // 水平部分
        const hGeometry = new THREE.PlaneGeometry(cornerSize, cornerWidth);
        const hCorner = new THREE.Mesh(hGeometry, crosshairMaterial.clone());
        
        // 垂直部分
        const vGeometry = new THREE.PlaneGeometry(cornerWidth, cornerSize);
        const vCorner = new THREE.Mesh(vGeometry, crosshairMaterial.clone());
        
        cornerGroup.add(hCorner);
        cornerGroup.add(vCorner);
        
        // 设置角的位置
        const x = (i % 2 === 0) ? -lockBoxSize/2 : lockBoxSize/2;
        const y = (i < 2) ? lockBoxSize/2 : -lockBoxSize/2;
        cornerGroup.position.set(x, y, 0);
        
        // 根据位置旋转角
        if (i === 1 || i === 2) hCorner.position.x = -cornerSize/2;
        else hCorner.position.x = cornerSize/2;
        if (i < 2) vCorner.position.y = -cornerSize/2;
        else vCorner.position.y = cornerSize/2;
        
        cornerGroup.name = 'lockBox';
        cornerGroup.visible = false; // 默认隐藏
        corners.push(cornerGroup);
        crosshair.add(cornerGroup);
    }
    
    // 创建瞄准镜的相机
    crosshair.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    crosshair.camera.position.z = 1;
    
    // 添加瞄准镜状态
    crosshair.isTargetLocked = false;
    crosshair.lockBoxScale = 1;
    crosshair.lockStartTime = 0;
}

// 更新瞄准镜状态
function updateCrosshair() {
    // 检查是否有目标在瞄准镜内
    let targetInSight = false;
    let targetDistance = Infinity;
    let targetObject = null;
    
    // 创建一条从相机发出的射线
    const raycaster = new THREE.Raycaster();
    
    // 设置检测范围，移动设备使用更大范围
    const detectionRadius = isMobile ? settings.mobileAimAssistRange : 0.1;
    
    // 创建多个检测点，提高命中机会
    const positions = [
        new THREE.Vector2(0, 0) // 中心点
    ];
    
    // 移动设备使用更多检测点
    if (isMobile) {
        // 添加更多检测点，形成一个网格
        for (let x = -1; x <= 1; x += 0.5) {
            for (let y = -1; y <= 1; y += 0.5) {
                if (x !== 0 || y !== 0) { // 跳过中心点
                    positions.push(new THREE.Vector2(
                        x * detectionRadius,
                        y * detectionRadius
                    ));
                }
            }
        }
    } else {
        // PC仅使用几个关键检测点
        positions.push(
            new THREE.Vector2(detectionRadius, detectionRadius),
            new THREE.Vector2(-detectionRadius, detectionRadius),
            new THREE.Vector2(detectionRadius, -detectionRadius),
            new THREE.Vector2(-detectionRadius, -detectionRadius)
        );
    }

    // 对多个点进行检测，增加锁定成功率
    for (const position of positions) {
        raycaster.setFromCamera(position, camera);
        const intersects = raycaster.intersectObjects(targets);
        
        if (intersects.length > 0) {
            const distance = intersects[0].distance;
            if (distance < targetDistance) {
                targetDistance = distance;
                targetObject = intersects[0].object;
                targetInSight = true;
            }
        }
    }

    // 移动设备增加瞄准辅助
    if (isMobile && !targetInSight) {
        // 找到最近的目标，即使不在瞄准镜内
        const cameraPosition = camera.position.clone();
        let closestTarget = null;
        let closestDistance = 30; // 最大辅助距离
        
        for (const target of targets) {
            const distance = cameraPosition.distanceTo(target.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = target;
            }
        }
        
        // 如果有足够近的目标，提供瞄准辅助
        if (closestTarget) {
            targetInSight = true;
            targetObject = closestTarget;
            targetDistance = closestDistance;
        }
    }

    if (targetInSight) {
        // 有目标在瞄准镜内
        if (!crosshair.isTargetLocked) {
            crosshair.lockStartTime = Date.now();
            playLockOnSound();
        }

        // 计算锁定动画的进度
        const lockDuration = isMobile ? 200 : 300; // 移动设备锁定更快
        const timeSinceLock = Date.now() - crosshair.lockStartTime;
        const lockProgress = Math.min(timeSinceLock / lockDuration, 1);

        // 更新锁定框的缩放
        const initialScale = 1.5;
        const targetScale = 1;
        crosshair.lockBoxScale = initialScale - (initialScale - targetScale) * lockProgress;

        // 根据距离计算颜色
        const maxDistance = 30;
        const normalizedDistance = Math.min(targetDistance / maxDistance, 1);
        const color = new THREE.Color();
        color.setHSL(0.3 - normalizedDistance * 0.3, 1, 0.5);

        // 更新所有瞄准镜部件的颜色和可见性
        crosshair.children.forEach(part => {
            if (part.name === 'crosshairPart') {
                part.material.color = color;
                part.material.opacity = 0.9;
            } else if (part.name === 'lockBox') {
                part.visible = true;
                part.scale.set(crosshair.lockBoxScale, crosshair.lockBoxScale, 1);
                part.children.forEach(corner => {
                    corner.material.color = color;
                    corner.material.opacity = lockProgress;
                });
            }
        });

        // 添加更明显的脉冲效果
        const pulseFrequency = 8;
        const pulseIntensity = Math.sin(Date.now() * 0.01 * pulseFrequency) * 0.3 + 0.7;
        crosshair.children.forEach(part => {
            if (part.name === 'lockBox') {
                part.children.forEach(corner => {
                    corner.material.opacity = pulseIntensity * lockProgress;
                });
            }
        });

        // 标记目标已锁定
        if (targetObject) {
            targetObject.isLocked = true;
            
            // 移动设备上添加额外瞄准辅助
            if (isMobile) {
                // 添加一个辅助箭头指向目标（可选）
                const targetScreenPosition = new THREE.Vector3();
                targetObject.getWorldPosition(targetScreenPosition);
                targetScreenPosition.project(camera);
            }
        }
    } else {
        // 没有目标在瞄准镜内
        const defaultColor = new THREE.Color(0xFF0000);
        crosshair.children.forEach(part => {
            if (part.name === 'crosshairPart') {
                part.material.color = defaultColor;
                part.material.opacity = 0.8;
            } else if (part.name === 'lockBox') {
                part.visible = false;
            }
        });

        // 重置锁定状态
        crosshair.lockStartTime = 0;
    }

    // 更新瞄准镜状态
    crosshair.isTargetLocked = targetInSight;
    crosshair.targetDistance = targetDistance;
}

// 播放瞄准锁定音效
function playLockOnSound() {
    // 如果声音已禁用，直接返回
    if (!settings.soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建主音调振荡器
        const mainOscillator = audioContext.createOscillator();
        mainOscillator.type = 'sine';
        mainOscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        mainOscillator.frequency.setValueAtTime(1760, audioContext.currentTime + 0.1);
        
        // 创建次音振荡器
        const subOscillator = audioContext.createOscillator();
        subOscillator.type = 'square';
        subOscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        
        // 创建音量控制
        const mainGain = audioContext.createGain();
        mainGain.gain.setValueAtTime(0.2, audioContext.currentTime);
        mainGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        const subGain = audioContext.createGain();
        subGain.gain.setValueAtTime(0.1, audioContext.currentTime);
        subGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        // 连接节点
        mainOscillator.connect(mainGain);
        subOscillator.connect(subGain);
        mainGain.connect(audioContext.destination);
        subGain.connect(audioContext.destination);
        
        // 播放声音
        mainOscillator.start();
        subOscillator.start();
        mainOscillator.stop(audioContext.currentTime + 0.2);
        subOscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Animation loop
function animate() {
    if (gameOver) return;
    
    animationId = requestAnimationFrame(animate);
    
    updatePlane();
    updateGame();
    updateBullets();
    
    // 仅在非移动设备或高性能设备上运行更复杂的效果
    if (!isMobile || window.devicePixelRatio <= 1) {
        updateAirEffects(); // 更新螺旋桨气流效果
    }
    
    checkCollisions();
    
    // 移动设备简化渲染
    if (isMobile) {
        // 减少渲染分辨率以提高性能
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(pixelRatio * 0.8);
    }
    
    renderer.render(scene, camera);
}

// Initialize audio context
function initAudio() {
    try {
        // 检查声音设置，如果禁用了声音，则直接返回
        if (!settings.soundEnabled) {
            console.log('Sound is disabled');
            return;
        }
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建螺旋桨音效
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // 设置更真实的螺旋桨声音
        oscillator.type = 'sawtooth'; // 使用锯齿波
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        
        // 添加更复杂的音频处理
        // 1. 主低通滤波器使声音更圆润
        const mainFilter = audioContext.createBiquadFilter();
        mainFilter.type = 'lowpass';
        mainFilter.frequency.setValueAtTime(800, audioContext.currentTime);
        mainFilter.Q.setValueAtTime(2, audioContext.currentTime);
        
        // 2. 添加动态压缩使声音更有深度
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressor.knee.setValueAtTime(30, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
        compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);
        
        // 3. 添加少量的立体声效果，使声音更自然
        const stereoNode = audioContext.createStereoPanner();
        stereoNode.pan.setValueAtTime(0.2, audioContext.currentTime);
        
        // 4. 添加谐波振荡器增加音色复杂度
        const harmonicOscillator = audioContext.createOscillator();
        harmonicOscillator.type = 'triangle';
        harmonicOscillator.frequency.setValueAtTime(300, audioContext.currentTime); // 2倍频率
        const harmonicGain = audioContext.createGain();
        harmonicGain.gain.setValueAtTime(0.1, audioContext.currentTime); // 较低音量
        
        // 设置初始音量
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        
        // 连接音频节点
        oscillator.connect(mainFilter);
        harmonicOscillator.connect(harmonicGain);
        harmonicGain.connect(mainFilter);
        
        mainFilter.connect(compressor);
        compressor.connect(stereoNode);
        stereoNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 开始发声
        oscillator.start();
        harmonicOscillator.start();
        
        // 保存引用以便后续调整
        if (propeller) {
            propeller.sound = gainNode;
            propeller.oscillator = oscillator;
            propeller.harmonicOscillator = harmonicOscillator;
            propeller.filter = mainFilter;
            propeller.stereoNode = stereoNode;
        }
    } catch (e) {
        console.log('Audio initialization failed:', e);
    }
}

// 创建螺旋桨气流效果
function createPropellerAirEffect() {
    // 限制效果频率，不要每一帧都创建
    if (Math.random() > 0.2) return;
    
    // 创建气流粒子（小白点）
    const particleGeometry = new THREE.SphereGeometry(0.03, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.3
    });
    
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    
    // 设置气流粒子的初始位置（在螺旋桨前方）
    const propellerWorldPosition = new THREE.Vector3();
    propeller.getWorldPosition(propellerWorldPosition);
    
    // 添加一些随机偏移，使气流效果更自然
    const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
    );
    
    const propellerDirection = new THREE.Vector3(0, 0, 1);
    propellerDirection.applyQuaternion(plane.quaternion);
    
    particle.position.copy(propellerWorldPosition)
        .add(propellerDirection.multiplyScalar(1.5))
        .add(randomOffset);
    
    scene.add(particle);
    
    // 存储粒子创建时间和初始位置
    particle.userData.creationTime = Date.now();
    particle.userData.initialPosition = particle.position.clone();
    particle.userData.velocity = propellerDirection.clone()
        .multiplyScalar(0.2 + Math.random() * 0.1);
    
    // 添加到要更新的粒子列表
    if (!window.airParticles) window.airParticles = [];
    window.airParticles.push(particle);
    
    // 限制粒子数量，避免性能问题
    if (window.airParticles.length > 30) {
        const oldestParticle = window.airParticles.shift();
        scene.remove(oldestParticle);
        oldestParticle.material.dispose();
        oldestParticle.geometry.dispose();
    }
}

// 更新气流粒子效果
function updateAirEffects() {
    if (!window.airParticles) return;
    
    const currentTime = Date.now();
    
    // 更新每个气流粒子
    window.airParticles.forEach((particle, index) => {
        const age = currentTime - particle.userData.creationTime;
        const lifespan = 1000; // 气流粒子寿命（毫秒）
        
        if (age > lifespan) {
            // 粒子寿命结束，移除
            scene.remove(particle);
            particle.material.dispose();
            particle.geometry.dispose();
            window.airParticles[index] = null;
        } else {
            // 更新粒子位置
            particle.position.add(particle.userData.velocity);
            
            // 随着年龄增长，使粒子变小、变淡
            const lifeRatio = age / lifespan;
            const scaleDown = 1 - lifeRatio;
            particle.scale.set(scaleDown, scaleDown, scaleDown);
            particle.material.opacity = 0.5 * (1 - lifeRatio);
            
            // 添加一些湍流，使运动更自然
            const turbulence = new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            );
            particle.position.add(turbulence);
        }
    });
    
    // 清理已移除的粒子
    window.airParticles = window.airParticles.filter(particle => particle !== null);
}

// 添加声音控制按钮
function addSoundControl() {
    const soundButton = document.createElement('button');
    soundButton.id = 'sound-control';
    soundButton.innerHTML = settings.soundEnabled ? '🔊' : '🔇';
    soundButton.title = settings.soundEnabled ? '关闭声音' : '开启声音';
    
    // 设置按钮样式
    soundButton.style.position = 'absolute';
    soundButton.style.top = '10px';
    soundButton.style.right = '10px';
    soundButton.style.zIndex = '1000';
    soundButton.style.padding = '8px 12px';
    soundButton.style.fontSize = '20px';
    soundButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    soundButton.style.color = 'white';
    soundButton.style.border = 'none';
    soundButton.style.borderRadius = '4px';
    soundButton.style.cursor = 'pointer';
    
    // 添加点击事件
    soundButton.addEventListener('click', toggleSound);
    
    document.body.appendChild(soundButton);
}

// 切换声音开关
function toggleSound() {
    settings.soundEnabled = !settings.soundEnabled;
    
    // 更新按钮显示
    const soundButton = document.getElementById('sound-control');
    if (soundButton) {
        soundButton.innerHTML = settings.soundEnabled ? '🔊' : '🔇';
        soundButton.title = settings.soundEnabled ? '关闭声音' : '开启声音';
    }
    
    // 如果开启声音，重新初始化音频
    if (settings.soundEnabled) {
        initAudio();
    } else if (audioContext) {
        // 如果关闭声音，停止当前音频
        try {
            // 关闭当前正在播放的声音
            if (propeller && propeller.sound) {
                propeller.sound.gain.setValueAtTime(0, audioContext.currentTime);
            }
        } catch (e) {
            console.log('Error stopping audio:', e);
        }
    }
}

// 添加视角控制提示
function addViewControls() {
    const viewControlsInfo = document.createElement('div');
    viewControlsInfo.id = 'view-controls-info';
    viewControlsInfo.innerHTML = `
        <p>按 V 切换视角模式</p>
        <p>自由观察模式: 按 Q/E 旋转视角</p>
        <p>使用鼠标滚轮调整距离</p>
        <p>按 ↑/↓ 调整高度</p>
    `;
    
    // 设置样式
    viewControlsInfo.style.position = 'absolute';
    viewControlsInfo.style.bottom = '10px';
    viewControlsInfo.style.right = '10px';
    viewControlsInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    viewControlsInfo.style.color = 'white';
    viewControlsInfo.style.padding = '10px';
    viewControlsInfo.style.borderRadius = '5px';
    viewControlsInfo.style.fontSize = '14px';
    viewControlsInfo.style.zIndex = '1000';
    
    document.body.appendChild(viewControlsInfo);
}

// 切换相机模式
function toggleCameraMode() {
    settings.cameraMode = (settings.cameraMode + 1) % 2;
    
    // 重置自由观察模式的初始位置
    if (settings.cameraMode === 1) {
        cameraOrbit = 0;
        cameraDistance = 10;
        cameraHeight = 5;
    }
    
    // 显示当前模式信息
    const modeInfo = document.createElement('div');
    modeInfo.id = 'mode-info';
    modeInfo.textContent = settings.cameraMode === 0 ? '跟随模式' : '自由观察模式';
    
    // 样式设置
    modeInfo.style.position = 'absolute';
    modeInfo.style.top = '50%';
    modeInfo.style.left = '50%';
    modeInfo.style.transform = 'translate(-50%, -50%)';
    modeInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modeInfo.style.color = 'white';
    modeInfo.style.padding = '10px 20px';
    modeInfo.style.borderRadius = '5px';
    modeInfo.style.fontSize = '18px';
    modeInfo.style.zIndex = '2000';
    
    // 添加到页面并设置自动消失
    document.body.appendChild(modeInfo);
    
    setTimeout(() => {
        if (document.body.contains(modeInfo)) {
            document.body.removeChild(modeInfo);
        }
    }, 1500);
}

// 检测是否为移动设备
function detectMobileDevice() {
    // 检查用户代理
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // 检查常见移动设备关键词
    if (/android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent)) {
        isMobile = true;
    }
    
    // 检查屏幕尺寸
    if (window.innerWidth <= 800 || window.innerHeight <= 600) {
        isMobile = true;
    }
    
    // 检查触摸功能
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        isMobile = true;
    }
    
    console.log("设备检测结果:", isMobile ? "移动设备" : "桌面设备");
    
    // 移动设备时调整某些游戏设置
    if (isMobile) {
        // 减少粒子效果和云的数量以提高性能
        settings.maxClouds = 8;
        settings.maxObstacles = 12;
        settings.maxBullets = 25;
        
        // 简化碰撞检测
        settings.simplifiedCollision = true;
        
        // 增大交互元素尺寸
        joystickSize = 120;
    }
}

// 创建触摸控制界面
function createTouchControls() {
    touchControls = document.createElement('div');
    touchControls.id = 'touch-controls';
    
    // 虚拟摇杆容器
    const joystickContainer = document.createElement('div');
    joystickContainer.id = 'joystick-container';
    
    // 虚拟摇杆底座
    const joystickBase = document.createElement('div');
    joystickBase.id = 'joystick-base';
    
    // 虚拟摇杆手柄
    const joystickHandle = document.createElement('div');
    joystickHandle.id = 'joystick-handle';
    
    // 射击按钮
    const shootButton = document.createElement('div');
    shootButton.id = 'shoot-button';
    shootButton.innerHTML = '🔫';
    
    // 视角切换按钮
    const viewButton = document.createElement('div');
    viewButton.id = 'view-button';
    viewButton.innerHTML = '👁️';
    
    // 高度控制按钮
    const upButton = document.createElement('div');
    upButton.id = 'up-button';
    upButton.innerHTML = '↑';
    
    const downButton = document.createElement('div');
    downButton.id = 'down-button';
    downButton.innerHTML = '↓';
    
    // 组装控制元素
    joystickBase.appendChild(joystickHandle);
    joystickContainer.appendChild(joystickBase);
    touchControls.appendChild(joystickContainer);
    touchControls.appendChild(shootButton);
    touchControls.appendChild(viewButton);
    touchControls.appendChild(upButton);
    touchControls.appendChild(downButton);
    
    // 设置样式
    setTouchControlStyles();
    
    // 添加到页面
    document.body.appendChild(touchControls);
    
    // 设置初始位置
    joystickPosition = {
        x: joystickSize,
        y: window.innerHeight - joystickSize - 20
    };
    
    joystickBase.style.left = joystickPosition.x - joystickSize/2 + 'px';
    joystickBase.style.top = joystickPosition.y - joystickSize/2 + 'px';
    joystickHandle.style.left = '50%';
    joystickHandle.style.top = '50%';
    
    // 添加触摸事件处理
    shootButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        shootButtonActive = true;
    });
    
    shootButton.addEventListener('touchend', function(e) {
        e.preventDefault();
        shootButtonActive = false;
    });
    
    // 高度控制按钮
    upButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        keys.Shift = true;
    });
    
    upButton.addEventListener('touchend', function(e) {
        e.preventDefault();
        keys.Shift = false;
    });
    
    downButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        keys.Control = true;
    });
    
    downButton.addEventListener('touchend', function(e) {
        e.preventDefault();
        keys.Control = false;
    });
    
    // 视角切换按钮
    viewButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        toggleCameraMode();
    });
}

// 设置触摸控制样式
function setTouchControlStyles() {
    const css = `
        #touch-controls {
            position: fixed;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 10;
        }
        
        #joystick-base {
            position: absolute;
            width: ${joystickSize}px;
            height: ${joystickSize}px;
            background-color: rgba(200, 200, 200, 0.3);
            border-radius: 50%;
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            -webkit-user-select: none;
            transform: translate(-50%, -50%);
        }
        
        #joystick-handle {
            position: absolute;
            width: ${joystickSize/2}px;
            height: ${joystickSize/2}px;
            background-color: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            pointer-events: none;
            transform: translate(-50%, -50%);
        }
        
        #shoot-button, #view-button, #up-button, #down-button {
            position: absolute;
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background-color: rgba(200, 200, 200, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            pointer-events: auto;
            user-select: none;
            -webkit-user-select: none;
        }
        
        #shoot-button {
            right: 20px;
            bottom: 100px;
        }
        
        #view-button {
            right: 20px;
            bottom: 180px;
        }
        
        #up-button {
            right: 20px;
            top: 100px;
        }
        
        #down-button {
            right: 20px;
            top: 180px;
        }
    `;
    
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}

// 触摸开始事件处理
function handleTouchStart(event) {
    event.preventDefault();
    
    const touch = event.touches[0];
    const time = new Date().getTime();
    
    // 检测双击（用于射击）
    if (time - lastTouchTime < 300) {
        shootButtonActive = true;
        setTimeout(() => {
            shootButtonActive = false;
        }, 100);
    }
    lastTouchTime = time;
    
    // 判断是否触摸到摇杆区域
    const joystickBase = document.getElementById('joystick-base');
    if (joystickBase) {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // 计算触摸点到摇杆中心的距离
        const distance = Math.sqrt(
            Math.pow(touch.clientX - centerX, 2) + 
            Math.pow(touch.clientY - centerY, 2)
        );
        
        // 如果触摸点在摇杆区域内，激活摇杆
        if (distance <= joystickSize) {
            joystickActive = true;
            updateJoystickPosition(touch.clientX, touch.clientY);
        }
    }
}

// 触摸移动事件处理
function handleTouchMove(event) {
    event.preventDefault();
    
    if (joystickActive && event.touches.length > 0) {
        const touch = event.touches[0];
        updateJoystickPosition(touch.clientX, touch.clientY);
    }
}

// 触摸结束事件处理
function handleTouchEnd(event) {
    event.preventDefault();
    
    // 重置摇杆位置
    if (joystickActive) {
        joystickActive = false;
        resetJoystick();
        
        // 重置键盘状态
        keys.w = false;
        keys.s = false;
        keys.a = false;
        keys.d = false;
    }
}

// 更新摇杆位置
function updateJoystickPosition(touchX, touchY) {
    const joystickBase = document.getElementById('joystick-base');
    const joystickHandle = document.getElementById('joystick-handle');
    
    if (!joystickBase || !joystickHandle) return;
    
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // 计算触摸点相对于摇杆中心的偏移
    let offsetX = touchX - centerX;
    let offsetY = touchY - centerY;
    
    // 限制摇杆手柄在基座内
    const maxOffset = joystickSize / 2;
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    if (distance > maxOffset) {
        const ratio = maxOffset / distance;
        offsetX *= ratio;
        offsetY *= ratio;
    }
    
    // 更新摇杆手柄位置
    joystickHandle.style.left = `calc(50% + ${offsetX}px)`;
    joystickHandle.style.top = `calc(50% + ${offsetY}px)`;
    
    // 根据摇杆位置设置方向键状态
    // 前/后方向
    if (offsetY < -maxOffset * 0.3) {
        keys.w = true;
        keys.s = false;
    } else if (offsetY > maxOffset * 0.3) {
        keys.s = false;
        keys.w = false;
    } else {
        keys.w = false;
        keys.s = false;
    }
    
    // 左/右方向
    if (offsetX < -maxOffset * 0.3) {
        keys.a = true;
        keys.d = false;
    } else if (offsetX > maxOffset * 0.3) {
        keys.d = true;
        keys.a = false;
    } else {
        keys.a = false;
        keys.d = false;
    }
}

// 重置摇杆
function resetJoystick() {
    const joystickHandle = document.getElementById('joystick-handle');
    if (joystickHandle) {
        joystickHandle.style.left = '50%';
        joystickHandle.style.top = '50%';
    }
}

// 处理设备方向事件（陀螺仪）
function handleDeviceOrientation(event) {
    // 仅在观察模式时使用设备方向控制
    if (settings.cameraMode !== 1) return;
    
    // 获取设备方向角度
    const gamma = event.gamma; // 左右倾斜角度 [-90, 90]
    const beta = event.beta;   // 前后倾斜角度 [-180, 180]
    
    // 忽略小角度变化，避免抖动
    if (Math.abs(gamma) < 5 && Math.abs(beta - 90) < 5) {
        if (isDeviceTilting) {
            isDeviceTilting = false;
        }
        return;
    }
    
    isDeviceTilting = true;
    
    // 根据左右倾斜调整相机旋转
    if (gamma < -10) {
        cameraOrbit += settings.rotationSpeed * 0.5;
    } else if (gamma > 10) {
        cameraOrbit -= settings.rotationSpeed * 0.5;
    }
    
    // 根据前后倾斜调整相机高度
    if (beta < 60) {
        cameraHeight += 0.1;
    } else if (beta > 100) {
        cameraHeight -= 0.1;
    }
    
    // 限制相机高度
    cameraHeight = Math.max(1, Math.min(cameraHeight, 20));
}

// Start the game
window.onload = init; 