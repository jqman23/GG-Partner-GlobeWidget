// GG Partner Globe Widget
// Renders an interactive Three.js globe with partner pins. Hover shows an info
// box; click opens the partner website. Side buttons recentre on a region.

let scene, camera, renderer, globe, raycaster, mouse;
let pins = [];

// Render-on-demand: instead of rendering every frame forever, we only render
// when something actually changes (rotation, recentre, resize). This keeps the
// widget from burning CPU/GPU while it sits idle in the page.
let renderQueued = false;
function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        renderer.render(scene, camera);
    });
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 7; // Move camera back to make the globe larger

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap DPR for perf
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("globeContainer").appendChild(renderer.domElement);

    // Shared texture loader, reused for the globe and every pin.
    const textureLoader = new THREE.TextureLoader();

    // Create the globe
    const geometry = new THREE.SphereGeometry(3.7, 64, 64);
    const texture = textureLoader.load(
        "https://custom.cvent.com/AE944F71438646268B70FF5BF3772347/files/event/6e39e63ddecc460ba1e0481e3ecf2d04/52a85de76da646afaf2dc81e3ecbb019.jpg",
        requestRender // re-render once the texture finishes loading
    );
    const material = new THREE.MeshBasicMaterial({ map: texture });
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Raycaster & mouse for hover/click detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Load the pin texture once and share one material across every pin instead
    // of creating a new TextureLoader + texture per pin (the original loaded the
    // same PNG 18 times).
    const pinTexture = textureLoader.load(
        "https://custom.cvent.com/AE944F71438646268B70FF5BF3772347/files/event/6e39e63ddecc460ba1e0481e3ecf2d04/1061a272f608412bbfa6c93d9fc0ea7c.png",
        requestRender
    );
    const pinMaterial = new THREE.SpriteMaterial({ map: pinTexture });

    function createPin(lat, lon, info) {
        const pin = new THREE.Sprite(pinMaterial);

        const phi = (90 - lat) * (Math.PI / 180);
        const theta = -(lon * (Math.PI / 180));
        const radius = 3.8; // Keeps the pin floating slightly above the globe

        pin.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );

        pin.scale.set(0.3, 0.3, 1);
        pin.userData = info;
        globe.add(pin);
        pins.push(pin);
    }

    // Build pins from enabled partner data (js/partners.js)
    (window.PARTNERS || [])
        .filter((p) => p.enabled)
        .forEach((p) => createPin(p.lat, p.lon, p));

    // Hover effect for the pins
    document.addEventListener("mousemove", (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(pins);

        const infoBox = document.getElementById("infoBox");
        const globeContainer = document.getElementById("globeContainer");

        if (intersects.length > 0) {
            const pin = intersects[0].object;
            const info = pin.userData;

            let infoBoxX = event.clientX + 15;  // X position to the right of the cursor
            let infoBoxY = event.clientY + 15;  // Y position below the cursor

            const infoBoxHeight = infoBox.offsetHeight;

            // Centre the box vertically within the globe container
            const containerHeight = globeContainer.offsetHeight;
            infoBoxY = (containerHeight - infoBoxHeight) / 2;

            // Keep the info box from overflowing the right edge
            if (infoBoxX + infoBox.offsetWidth > window.innerWidth) {
                infoBoxX = window.innerWidth - infoBox.offsetWidth - 15;
            }

            infoBox.style.left = `${infoBoxX}px`;
            infoBox.style.top = `${infoBoxY}px`;
            infoBox.style.display = "block";

            infoBox.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <img src="${info.logo}" alt="${info.name}">
                    <strong style="font-size: 16px; margin-left: 10px;">${info.name}</strong>
                </div>
                <p style="font-size: 12px; margin: 10px 0 0 5px;">${info.description}</p>
            `;
        } else {
            infoBox.style.display = "none";
        }
    });

    // Click a pin to open its website
    document.addEventListener("click", (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(pins);

        if (intersects.length > 0) {
            window.open(intersects[0].object.userData.website, "_blank");
        }
    });

    // Drag to rotate
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    document.addEventListener("mousedown", (event) => {
        isDragging = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });

    document.addEventListener("mousemove", (event) => {
        if (!isDragging) return;
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;
        globe.rotation.y += deltaX * 0.005;
        globe.rotation.x += deltaY * 0.005;
        previousMousePosition = { x: event.clientX, y: event.clientY };
        requestRender();
    });

    // Keep the renderer sized to the window
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        requestRender();
    });

    requestRender();
}

// Rotation functions for the on-screen arrows
function rotateLeft() {
    globe.rotation.y -= 0.1;
    requestRender();
}

function rotateRight() {
    globe.rotation.y += 0.1;
    requestRender();
}

function rotateTop() {
    globe.rotation.x -= 0.1;
    requestRender();
}

function rotateBottom() {
    globe.rotation.x += 0.1;
    requestRender();
}

// Recentre on a given lat/lon by ROTATING THE GLOBE (the camera stays fixed at
// 0,0,7). The old version orbited the camera instead, which left drag/arrow
// rotation misaligned with the screen afterwards — that was the "out of whack"
// bug the Reset button was working around.
function centerGlobe(lat, lon) {
    // Local position of the target on the unit sphere — same convention as the
    // pins, so a centred point lines up with its pin.
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = -(lon * (Math.PI / 180));
    const v = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
    );

    // Rotate the globe so that point faces the camera (+Z), north staying up:
    // yaw about Y to swing the longitude to front, then pitch about X to lift
    // the latitude to centre.
    const r = Math.hypot(v.x, v.z);
    const yaw = Math.atan2(-v.x, v.z);
    const pitch = Math.atan2(v.y, r);

    // Set the Euler angles DIRECTLY (order XYZ) rather than building a
    // quaternion and assigning it. Three's "XYZ" Euler with z=0 is exactly
    // Rx(pitch)*Ry(yaw) — the orientation we want — but storing the angles
    // literally keeps roll (z) at 0. Assigning a quaternion instead would force
    // a decomposition that, for |yaw| > 90° (Australia, New Zealand), flips into
    // a branch with z = ±180°. Drag/arrows never touch z, so that baked-in roll
    // made those two regions feel inverted afterwards.
    globe.rotation.set(pitch, yaw, 0);
    requestRender();
}

document.addEventListener("DOMContentLoaded", function () {
    init();

    // Region buttons
    document.getElementById("australiaButton").addEventListener("click", function () {
        centerGlobe(-25.2744, 133.7751); // Australia
    });

    document.getElementById("newZealandButton").addEventListener("click", function () {
        centerGlobe(-40.9006, 174.886); // New Zealand
    });

    document.getElementById("northamerica").addEventListener("click", function () {
        centerGlobe(37.0902, -95.7129); // United States
    });

    document.getElementById("ukButton").addEventListener("click", function () {
        centerGlobe(51.5074, -0.1278); // United Kingdom
    });

    document.getElementById("reset").addEventListener("click", function () {
        centerGlobe(37.0902, -95.7129); // Reset
    });
});
