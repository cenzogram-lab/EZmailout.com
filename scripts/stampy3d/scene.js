// Stampy as a glossy 3D vinyl toy, built from soft primitives in three.js and
// rendered offline by scripts/stampy3d/render.mjs (headless Chromium) to the
// transparent WebP files in src/frontend/src/assets/stampy/. The look follows
// the 2D Stampy (src/frontend/src/components/stampy): white puppy, tan ears
// and eye patch, cream muzzle, indigo mail cap with a red band and navy brim,
// red bandana with a heart stamp, brown satchel.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const COLOR = {
	white: 0xfbfaf6,
	tan: 0xd98a42,
	tanDark: 0xbf7434,
	cream: 0xf7efdf,
	navy: 0x1c2152,
	indigo: 0x5c5ee8,
	indigoDeep: 0x4a4bd0,
	red: 0xe2412d,
	redDeep: 0xc9321f,
	brown: 0x9a5f33,
	leather: 0xc2834a,
	gold: 0xe7a937,
	paper: 0xfbf8f1,
	steel: 0xc9cbd6,
	green: 0x1f9d63,
};

// ─── Materials ────────────────────────────────────────────────────────────
function vinyl(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial({
		color,
		roughness: 0.42,
		clearcoat: 0.6,
		clearcoatRoughness: 0.22,
		...extra,
	});
}
const gloss = (color, extra = {}) =>
	vinyl(color, {
		roughness: 0.18,
		clearcoat: 1,
		clearcoatRoughness: 0.06,
		...extra,
	});
const matte = (color, extra = {}) =>
	new THREE.MeshPhysicalMaterial({
		color,
		roughness: 0.75,
		clearcoat: 0.15,
		clearcoatRoughness: 0.6,
		...extra,
	});

function shade(mesh) {
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

function canvasTexture(w, h, draw) {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	draw(c.getContext("2d"), w, h);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 8;
	return t;
}

/**
 * A texture for a SphereGeometry painted per direction. `paint(x, y, z)`
 * gets the unit direction of a texel (z is towards the viewer) and returns
 * [r, g, b, a] in 0–255 / 0–1 over the base colour, or null. Supersampled
 * 2 × 2, so painted edges are smooth.
 */
function sphereTexture(base, paint, w = 1024, h = 512) {
	const b = new THREE.Color(base).convertLinearToSRGB();
	const br = b.r * 255;
	const bg = b.g * 255;
	const bb = b.b * 255;
	return canvasTexture(w, h, (ctx) => {
		const img = ctx.createImageData(w, h);
		const d = img.data;
		for (let py = 0; py < h; py++) {
			for (let px = 0; px < w; px++) {
				let r = 0;
				let g = 0;
				let bl = 0;
				for (let sy = 0; sy < 2; sy++) {
					for (let sx = 0; sx < 2; sx++) {
						const theta = (Math.PI * (py + 0.25 + sy * 0.5)) / h;
						const phi = (2 * Math.PI * (px + 0.25 + sx * 0.5)) / w;
						const st = Math.sin(theta);
						const x = -Math.cos(phi) * st;
						const y = Math.cos(theta);
						const z = Math.sin(phi) * st;
						let cr = br;
						let cg = bg;
						let cb = bb;
						const p = paint(x, y, z);
						if (p) {
							const a = p[3];
							cr = cr * (1 - a) + p[0] * a;
							cg = cg * (1 - a) + p[1] * a;
							cb = cb * (1 - a) + p[2] * a;
						}
						r += cr;
						g += cg;
						bl += cb;
					}
				}
				const i = (py * w + px) * 4;
				d[i] = r / 4;
				d[i + 1] = g / 4;
				d[i + 2] = bl / 4;
				d[i + 3] = 255;
			}
		}
		ctx.putImageData(img, 0, 0);
	});
}

const rgb = (hex) => {
	const c = new THREE.Color(hex).convertLinearToSRGB();
	return [c.r * 255, c.g * 255, c.b * 255];
};
const smooth = (e0, e1, x) => {
	const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return t * t * (3 - 2 * t);
};

// ─── Geometry helpers ─────────────────────────────────────────────────────
function ellipsoid(rx, ry, rz, mat, seg = 64) {
	const m = shade(
		new THREE.Mesh(
			new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)),
			mat,
		),
	);
	m.scale.set(rx, ry, rz);
	return m;
}

function capsule(radius, length, mat) {
	return shade(
		new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 12, 32), mat),
	);
}

function tube(points, radius, mat, closed = false) {
	const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
	return shade(
		new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 16, closed), mat),
	);
}

function roundedBox(w, h, d, r, mat) {
	return shade(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 6, r), mat));
}

/** A flat shape extruded with a soft bevel. */
function extruded(shape, depth, bevel, mat, curveSegments = 48) {
	const g = new THREE.ExtrudeGeometry(shape, {
		depth,
		bevelEnabled: true,
		bevelThickness: bevel,
		bevelSize: bevel,
		bevelSegments: 6,
		curveSegments,
	});
	g.center();
	return shade(new THREE.Mesh(g, mat));
}

function roundedRectShape(w, h, r) {
	const s = new THREE.Shape();
	const x = -w / 2;
	const y = -h / 2;
	s.moveTo(x + r, y);
	s.lineTo(x + w - r, y);
	s.quadraticCurveTo(x + w, y, x + w, y + r);
	s.lineTo(x + w, y + h - r);
	s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	s.lineTo(x + r, y + h);
	s.quadraticCurveTo(x, y + h, x, y + h - r);
	s.lineTo(x, y + r);
	s.quadraticCurveTo(x, y, x + r, y);
	return s;
}

function heartShape(size) {
	const s = new THREE.Shape();
	const k = size;
	s.moveTo(0, -0.45 * k);
	s.bezierCurveTo(-0.15 * k, -0.3 * k, -0.55 * k, -0.05 * k, -0.5 * k, 0.2 * k);
	s.bezierCurveTo(-0.45 * k, 0.48 * k, -0.08 * k, 0.5 * k, 0, 0.25 * k);
	s.bezierCurveTo(0.08 * k, 0.5 * k, 0.45 * k, 0.48 * k, 0.5 * k, 0.2 * k);
	s.bezierCurveTo(0.55 * k, -0.05 * k, 0.15 * k, -0.3 * k, 0, -0.45 * k);
	return s;
}

/** A plane showing a canvas drawing, for printed details (stamp, paper). */
function decal(w, h, px, draw, extra = {}) {
	const tex = canvasTexture(Math.round(px * (w / h)), px, draw);
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(w, h),
		new THREE.MeshPhysicalMaterial({
			map: tex,
			transparent: true,
			roughness: 0.5,
			clearcoat: 0.3,
			...extra,
		}),
	);
	m.receiveShadow = true;
	return m;
}

// ─── The head ─────────────────────────────────────────────────────────────
/** A floppy ear: a flattened teardrop along +y, its tip curling forward. */
function earGeometry() {
	const g = new THREE.SphereGeometry(1, 64, 48);
	const pos = g.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const t = (y + 1) / 2; // 0 at the root, 1 at the tip
		const width = 0.3 + 0.12 * Math.sin(Math.PI * Math.min(1, t * 1.15));
		const px = x * width * (1 - 0.35 * t * t);
		let py = t * 0.95;
		let pz = z * 0.12 * (1 - 0.4 * t);
		// The tip folds forward and down a little.
		const fold = Math.max(0, t - 0.55) / 0.45;
		pz += 0.22 * fold * fold;
		py -= 0.08 * fold * fold;
		pos.setXYZ(i, px, py, pz);
	}
	g.computeVertexNormals();
	return g;
}

// ─── The head ─────────────────────────────────────────────────────────────
const HEAD = new THREE.Vector3(1.12, 1.0, 0.98);

/** Surface point and normal of the head for a front-projected (fx, fy). */
function headPoint(fx, fy, lift = 0) {
	const z = Math.sqrt(Math.max(0, 1 - fx * fx - fy * fy));
	const p = new THREE.Vector3(fx * HEAD.x, fy * HEAD.y, z * HEAD.z);
	const n = new THREE.Vector3(fx / HEAD.x, fy / HEAD.y, z / HEAD.z).normalize();
	return { p: p.addScaledVector(n, lift), n };
}

function buildHead({ mouth = "open", eyes = "open", brows = "happy" } = {}) {
	const head = new THREE.Group();
	const tan = rgb(COLOR.tan);
	const pink = rgb(0xf4a497);
	const skin = sphereTexture(COLOR.white, (x, y, z) => {
		if (z <= 0) return null;
		// The tan patch round his left eye (the viewer's right).
		const dx = x - 0.43;
		const dy = y - 0.12;
		const ang = Math.atan2(dy, dx);
		const rad =
			0.3 + 0.035 * Math.sin(3 * ang + 0.6) + 0.02 * Math.cos(5 * ang);
		const dist = Math.hypot(dx * 0.95, dy);
		const edge = 1 - smooth(rad - 0.012, rad + 0.012, dist);
		if (edge > 0) return [...tan, edge];
		// Cheek blush.
		for (const cx of [-0.56, 0.56]) {
			const cd = Math.hypot((x - cx) / 1.15, y + 0.27);
			const a = 0.6 * (1 - smooth(0.02, 0.16, cd));
			if (a > 0.001) return [...pink, a];
		}
		return null;
	});
	const skull = ellipsoid(
		HEAD.x,
		HEAD.y,
		HEAD.z,
		vinyl(0xffffff, { map: skin }),
		128,
	);
	head.add(skull);

	// Muzzle with the painted mouth.
	const mouthCol = rgb(0x7c2128);
	const tongue = rgb(0xf27b6f);
	const navy = rgb(COLOR.navy);
	const muzzleTex = sphereTexture(COLOR.cream, (x, y, z) => {
		if (z <= 0) return null;
		// Philtrum under the nose.
		if (Math.abs(x) < 0.028 && y > -0.12 && y < 0.3)
			return [...navy, 1 - smooth(0.018, 0.028, Math.abs(x))];
		if (mouth === "closed") {
			// A gentle closed smile: a navy curve.
			const curve = -0.16 - 0.32 * (1 - (x / 0.42) ** 2);
			const on = Math.abs(x) < 0.44 && Math.abs(y - curve) < 0.03;
			return on ? [...navy, 1 - smooth(0.02, 0.03, Math.abs(y - curve))] : null;
		}
		// An open smile: flat top, round bottom, tongue inside, navy lip line.
		const ex = x / 0.44;
		const ey = (y + 0.14) / 0.42;
		const inside = ex * ex + ey * ey;
		if (y < -0.1 && inside < 1.12) {
			if (inside > 0.86 || y > -0.15) return [...navy, 1];
			const tx = (x - 0.02) / 0.25;
			const ty = (y + 0.5) / 0.15;
			if (tx * tx + ty * ty < 1) return [...tongue, 1];
			return [...mouthCol, 1];
		}
		return null;
	});
	const muzzle = ellipsoid(
		0.52,
		0.37,
		0.34,
		vinyl(0xffffff, { map: muzzleTex }),
		96,
	);
	muzzle.position.set(0, -0.4, 0.78);
	head.add(muzzle);

	const nose = ellipsoid(0.17, 0.115, 0.12, gloss(COLOR.navy));
	nose.position.set(0, -0.2, 1.09);
	head.add(nose);
	const noseShine = ellipsoid(
		0.05,
		0.025,
		0.02,
		gloss(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 }),
	);
	noseShine.position.set(-0.05, -0.16, 1.2);
	head.add(noseShine);

	// Eyes: glossy navy beads with a catchlight.
	for (const side of [-1, 1]) {
		const { p, n } = headPoint(0.37 * side, 0.06, -0.02);
		if (eyes === "happy") {
			const arc = tube(
				[-0.09, 0, 0.09].map((dx) => {
					const q = headPoint(
						0.37 * side + dx,
						0.06 + 0.05 * (1 - (dx / 0.09) ** 2),
						0.005,
					).p;
					return q;
				}),
				0.03,
				gloss(COLOR.navy),
			);
			head.add(arc);
		} else {
			const eye = ellipsoid(0.125, 0.145, 0.07, gloss(COLOR.navy));
			eye.position.copy(p);
			eye.lookAt(p.clone().add(n));
			head.add(eye);
			const shine = ellipsoid(
				0.035,
				0.035,
				0.02,
				gloss(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }),
			);
			shine.position.copy(headPoint(0.37 * side - 0.035, 0.1, 0.05).p);
			head.add(shine);
		}
		// Brows.
		const lift = brows === "raised" ? 0.06 : 0;
		const browPts = [-0.11, 0, 0.11].map((dx) => {
			const arch =
				brows === "focused"
					? 0.02 * (dx / 0.11) * -side
					: 0.035 * (1 - (dx / 0.11) ** 2);
			return headPoint(0.37 * side + dx, 0.27 + lift + arch, 0.012).p;
		});
		head.add(tube(browPts, 0.028, gloss(COLOR.navy)));
	}

	// Ears: soft tan flaps out to the sides.
	for (const side of [-1, 1]) {
		const pivot = new THREE.Group();
		pivot.position.set(0.9 * side, 0.3, -0.06);
		pivot.rotation.order = "YZX";
		pivot.rotation.z = -side * 1.32;
		pivot.rotation.y = side * 0.3;
		pivot.rotation.x = 0.12;
		const ear = shade(new THREE.Mesh(earGeometry(), vinyl(COLOR.tan)));
		pivot.add(ear);
		head.add(pivot);
	}
	return head;
}

// ─── The mail cap ─────────────────────────────────────────────────────────
function buildCap() {
	const cap = new THREE.Group();
	const dome = shade(
		new THREE.Mesh(
			new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2),
			vinyl(COLOR.indigo, { clearcoat: 0.9 }),
		),
	);
	dome.scale.set(1.1, 0.86, 0.99);
	dome.position.y = 0.5;
	cap.add(dome);
	const band = shade(
		new THREE.Mesh(
			new THREE.CylinderGeometry(1.1, 1.11, 0.14, 96, 1, true),
			vinyl(COLOR.red),
		),
	);
	band.scale.z = 0.9;
	band.position.y = 0.44;
	band.material.side = THREE.DoubleSide;
	cap.add(band);
	const lower = shade(
		new THREE.Mesh(
			new THREE.CylinderGeometry(1.12, 1.14, 0.16, 96, 1, true),
			vinyl(COLOR.navy),
		),
	);
	lower.material.side = THREE.DoubleSide;
	lower.scale.z = 0.92;
	lower.position.y = 0.31;
	cap.add(lower);
	const lowerRim = shade(
		new THREE.Mesh(
			new THREE.TorusGeometry(1.13, 0.05, 16, 96),
			vinyl(COLOR.navy),
		),
	);
	lowerRim.rotation.x = Math.PI / 2;
	lowerRim.scale.y = 0.92;
	lowerRim.position.y = 0.24;
	cap.add(lowerRim);
	// Brim: a soft navy visor over the forehead.
	const brimShape = new THREE.Shape();
	brimShape.absellipse(0, 0, 0.78, 0.26, Math.PI, 2 * Math.PI, false, 0);
	brimShape.lineTo(-0.78, 0);
	const brim = extruded(brimShape, 0.035, 0.03, vinyl(COLOR.navy));
	brim.rotation.x = Math.PI / 2 - 0.42;
	brim.position.set(0, 0.22, 0.92);
	cap.add(brim);
	// Envelope badge.
	const badge = roundedBox(0.34, 0.24, 0.07, 0.03, vinyl(0xd7a868));
	badge.position.set(0, 0.8, 0.95);
	badge.rotation.x = -0.5;
	cap.add(badge);
	const flap = tube(
		[
			new THREE.Vector3(-0.15, 0.09, 0.035),
			new THREE.Vector3(0, -0.02, 0.04),
			new THREE.Vector3(0.15, 0.09, 0.035),
		],
		0.016,
		vinyl(COLOR.navy),
	);
	badge.add(flap);
	// A crisp highlight on the dome, as in the illustration.
	return cap;
}

/** The painter's beret for the design pose. */
function buildBeret() {
	const g = new THREE.Group();
	const top = ellipsoid(
		1.22,
		0.42,
		1.08,
		vinyl(COLOR.indigo, { clearcoat: 0.8, roughness: 0.5 }),
		96,
	);
	top.position.set(-0.08, 0.78, -0.05);
	top.rotation.z = 0.2;
	g.add(top);
	const band = shade(
		new THREE.Mesh(
			new THREE.TorusGeometry(0.9, 0.06, 16, 96),
			vinyl(COLOR.indigoDeep),
		),
	);
	band.rotation.x = Math.PI / 2;
	band.position.set(-0.04, 0.6, -0.02);
	band.rotation.y = 0.2;
	g.add(band);
	const stem = capsule(0.045, 0.16, vinyl(COLOR.indigoDeep));
	stem.position.set(-0.16, 1.24, -0.05);
	stem.rotation.z = 0.35;
	g.add(stem);
	return g;
}

// ─── Body, bandana, satchel ───────────────────────────────────────────────
function latheBody() {
	const pts = [
		[0, 0],
		[0.42, 0.02],
		[0.6, 0.15],
		[0.68, 0.4],
		[0.66, 0.68],
		[0.56, 0.92],
		[0.38, 1.08],
		[0, 1.14],
	];
	const curve = new THREE.SplineCurve(
		pts.map(([x, y]) => new THREE.Vector2(x, y)),
	);
	const g = new THREE.LatheGeometry(curve.getPoints(48), 96);
	return shade(new THREE.Mesh(g, vinyl(COLOR.white)));
}

function bandana() {
	const g = new THREE.Group();
	const shape = new THREE.Shape();
	shape.moveTo(-0.5, 0);
	shape.quadraticCurveTo(0, 0.06, 0.5, 0);
	shape.quadraticCurveTo(0.2, -0.3, 0.03, -0.52);
	shape.quadraticCurveTo(0, -0.56, -0.03, -0.52);
	shape.quadraticCurveTo(-0.2, -0.3, -0.5, 0);
	const geo = new THREE.ExtrudeGeometry(shape, {
		depth: 0.04,
		bevelEnabled: true,
		bevelThickness: 0.025,
		bevelSize: 0.025,
		bevelSegments: 4,
		curveSegments: 32,
	});
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		pos.setZ(i, pos.getZ(i) - 0.55 * x * x);
	}
	geo.computeVertexNormals();
	const cloth = shade(
		new THREE.Mesh(geo, vinyl(COLOR.red, { roughness: 0.55, clearcoat: 0.35 })),
	);
	g.add(cloth);
	// The heart stamp.
	const stamp = decal(0.2, 0.22, 256, (ctx, w, h) => {
		ctx.fillStyle = "#fbf8f1";
		const r = 9;
		ctx.beginPath();
		ctx.rect(r, r, w - 2 * r, h - 2 * r);
		ctx.fill();
		// Perforated edge.
		for (let x = r; x <= w - r; x += 2 * r * 0.95) {
			for (const y of [r, h - r]) {
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		for (let y = r; y <= h - r; y += 2 * r * 0.95) {
			for (const x of [r, w - r]) {
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.fillStyle = "#e2412d";
		ctx.translate(w / 2, h / 2 + 6);
		const k = w * 0.42;
		ctx.beginPath();
		ctx.moveTo(0, 0.35 * k);
		ctx.bezierCurveTo(
			-0.15 * k,
			0.2 * k,
			-0.55 * k,
			-0.05 * k,
			-0.5 * k,
			-0.3 * k,
		);
		ctx.bezierCurveTo(-0.45 * k, -0.58 * k, -0.08 * k, -0.6 * k, 0, -0.35 * k);
		ctx.bezierCurveTo(
			0.08 * k,
			-0.6 * k,
			0.45 * k,
			-0.58 * k,
			0.5 * k,
			-0.3 * k,
		);
		ctx.bezierCurveTo(0.55 * k, -0.05 * k, 0.15 * k, 0.2 * k, 0, 0.35 * k);
		ctx.fill();
	});
	stamp.position.set(0, -0.2, 0.085);
	g.add(stamp);
	return g;
}

function satchel() {
	const g = new THREE.Group();
	const bag = roundedBox(
		0.56,
		0.44,
		0.22,
		0.08,
		vinyl(COLOR.leather, { roughness: 0.5 }),
	);
	g.add(bag);
	const flap = roundedBox(
		0.6,
		0.24,
		0.06,
		0.05,
		vinyl(COLOR.brown, { roughness: 0.48 }),
	);
	flap.position.set(0, 0.12, 0.11);
	flap.rotation.x = -0.12;
	g.add(flap);
	const button = ellipsoid(0.045, 0.045, 0.025, gloss(COLOR.red));
	button.position.set(0, 0.02, 0.15);
	g.add(button);
	// Letters peeking out.
	for (const [x, rz, c] of [
		[-0.08, 0.12, COLOR.paper],
		[0.1, -0.1, 0xf1e3c8],
	]) {
		const env = roundedBox(0.32, 0.22, 0.02, 0.012, matte(c));
		env.position.set(x, 0.24, -0.02);
		env.rotation.z = rz;
		g.add(env);
	}
	return g;
}

/** A round white paw with two toe lines, facing +z. */
function paw() {
	const g = new THREE.Group();
	g.add(ellipsoid(0.19, 0.18, 0.17, vinyl(COLOR.white)));
	for (const dx of [-0.055, 0.055]) {
		g.add(
			tube(
				[
					new THREE.Vector3(dx, 0.07, 0.155),
					new THREE.Vector3(dx, 0, 0.172),
					new THREE.Vector3(dx, -0.07, 0.155),
				],
				0.013,
				gloss(COLOR.navy),
			),
		);
	}
	return g;
}

/**
 * An arm from the shoulder to `hand` (root coordinates): a white capsule
 * aimed at it with the paw there, the paw turned by `pawTurn` (Euler, from
 * facing forward). Props are added to `arm.userData.paw`.
 */
function arm(shoulder, hand, pawTurn) {
	const pivot = new THREE.Group();
	pivot.position.copy(shoulder);
	const dir = hand.clone().sub(shoulder);
	const len = dir.length();
	pivot.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, -1, 0),
		dir.normalize(),
	);
	const upper = capsule(0.15, 0.36, vinyl(COLOR.white));
	upper.scale.y = len / 0.66;
	upper.position.y = -len / 2 + 0.04;
	pivot.add(upper);
	const p = paw();
	p.position.y = -len;
	p.quaternion.copy(pivot.quaternion).invert();
	if (pawTurn)
		p.quaternion.multiply(
			new THREE.Quaternion().setFromEuler(new THREE.Euler(...pawTurn)),
		);
	pivot.add(p);
	pivot.userData.paw = p;
	return pivot;
}

/**
 * The whole puppy standing on y = 0. Options pick the expression, the hat
 * and the arm angles; props are added by each pose.
 */
export function buildStampy({
	hat = "cap",
	mouth = "open",
	eyes = "open",
	brows = "happy",
	leftHand = [-0.74, 0.64, 0.22],
	rightHand = [0.74, 0.64, 0.22],
	leftPaw = null,
	rightPaw = null,
	satchel: withSatchel = true,
	headTilt = 0,
	headTurn = 0,
} = {}) {
	const root = new THREE.Group();
	const body = latheBody();
	body.position.y = 0.26;
	root.add(body);
	// Feet.
	for (const side of [-1, 1]) {
		const foot = ellipsoid(0.25, 0.17, 0.32, vinyl(COLOR.white));
		foot.position.set(0.3 * side, 0.15, 0.12);
		root.add(foot);
	}
	// Collar and bandana.
	const collar = shade(
		new THREE.Mesh(
			new THREE.TorusGeometry(0.47, 0.085, 20, 96),
			vinyl(COLOR.red, { roughness: 0.55 }),
		),
	);
	collar.rotation.x = Math.PI / 2;
	collar.position.y = 1.3;
	root.add(collar);
	const scarf = bandana();
	scarf.position.set(0, 1.32, 0.5);
	scarf.rotation.x = -0.38;
	root.add(scarf);
	if (withSatchel) {
		const bag = satchel();
		bag.position.set(0.66, 0.52, 0.26);
		bag.rotation.y = 0.55;
		bag.rotation.z = -0.06;
		root.add(bag);
		root.add(
			tube(
				[
					new THREE.Vector3(-0.42, 1.3, 0.32),
					new THREE.Vector3(-0.2, 1.06, 0.6),
					new THREE.Vector3(0.18, 0.84, 0.66),
					new THREE.Vector3(0.52, 0.72, 0.5),
					new THREE.Vector3(0.64, 0.7, 0.3),
				],
				0.042,
				vinyl(COLOR.brown, { roughness: 0.5 }),
			),
		);
	}
	// Arms.
	const arms = {};
	for (const [key, side, hand, turn] of [
		["left", -1, leftHand, leftPaw],
		["right", 1, rightHand, rightPaw],
	]) {
		const a = arm(
			new THREE.Vector3(0.54 * side, 1.12, 0.06),
			new THREE.Vector3(...hand),
			turn,
		);
		root.add(a);
		arms[key] = a;
	}
	// Head.
	const headGroup = new THREE.Group();
	headGroup.position.y = 2.2;
	headGroup.rotation.z = headTilt;
	headGroup.rotation.y = headTurn;
	headGroup.add(buildHead({ mouth, eyes, brows }));
	if (hat === "cap") headGroup.add(buildCap());
	if (hat === "beret") headGroup.add(buildBeret());
	root.add(headGroup);
	root.userData = { arms, head: headGroup };
	return root;
}

// ─── Rendering ────────────────────────────────────────────────────────────
let renderer;
function setup(size) {
	if (!renderer) {
		renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			preserveDrawingBuffer: true,
		});
		renderer.setPixelRatio(1);
		renderer.toneMapping = THREE.NeutralToneMapping;
		renderer.toneMappingExposure = 1.0;
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.setClearColor(0x000000, 0);
		document.body.appendChild(renderer.domElement);
	}
	renderer.setSize(size, size, false);
	return renderer;
}

function stage(r) {
	const scene = new THREE.Scene();
	const pmrem = new THREE.PMREMGenerator(r);
	scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environmentIntensity = 0.55;
	scene.add(new THREE.HemisphereLight(0xeef0ff, 0x4a4560, 0.55));
	const key = new THREE.DirectionalLight(0xfff6ec, 2.4);
	key.position.set(-3.2, 6, 5);
	key.castShadow = true;
	key.shadow.mapSize.set(2048, 2048);
	key.shadow.bias = -0.0005;
	key.shadow.normalBias = 0.02;
	const s = key.shadow.camera;
	s.left = -4;
	s.right = 4;
	s.top = 5;
	s.bottom = -2;
	s.near = 0.5;
	s.far = 20;
	scene.add(key);
	const rim = new THREE.DirectionalLight(0xbac6ff, 1.6);
	rim.position.set(3, 3.5, -4.5);
	scene.add(rim);
	const fill = new THREE.DirectionalLight(0xffffff, 0.45);
	fill.position.set(4, 1, 3);
	scene.add(fill);
	return scene;
}

/**
 * Renders `object` framed on `frame` ({ cx, cy, half }: the square to show,
 * in world units at the object's depth) and returns a WebP data URL of
 * `size` px. Rendered at twice the size and scaled down for clean edges.
 */
export function renderObject(
	object,
	frame,
	size = 768,
	{ yaw = 0.3, pitch = 0.06 } = {},
) {
	const big = size * 2;
	const r = setup(big);
	const scene = stage(r);
	object.rotation.y = yaw;
	scene.add(object);
	const fov = 24;
	const dist = frame.half / Math.tan(THREE.MathUtils.degToRad(fov / 2));
	const cam = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
	cam.position.set(
		frame.cx,
		frame.cy + Math.sin(pitch) * dist,
		Math.cos(pitch) * dist,
	);
	cam.lookAt(frame.cx, frame.cy, 0);
	r.render(scene, cam);
	const out = document.createElement("canvas");
	out.width = size;
	out.height = size;
	const ctx = out.getContext("2d");
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(r.domElement, 0, 0, size, size);
	return out.toDataURL("image/webp", 0.92);
}

export {
	THREE,
	COLOR,
	vinyl,
	gloss,
	matte,
	ellipsoid,
	capsule,
	tube,
	roundedBox,
	extruded,
	roundedRectShape,
	heartShape,
	decal,
	canvasTexture,
	buildHead,
	buildCap,
	paw,
	shade,
};
