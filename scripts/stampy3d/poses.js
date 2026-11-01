// Stampy's poses: each builds the puppy with its props and says how to frame
// it. `renderPose(name)` returns the files to write. Frames are squares in
// world units ({ cx, cy, half }) at the puppy's depth; he stands on y = 0,
// head centre at y = 2.2.
import {
	COLOR,
	THREE,
	buildCap,
	buildHead,
	buildStampy,
	capsule,
	decal,
	ellipsoid,
	extruded,
	gloss,
	matte,
	paw,
	renderObject,
	roundedBox,
	shade,
	tube,
	vinyl,
} from "./scene.js";

/** Full figure, for the stages and wizard tips. */
const FULL = { cx: 0, cy: 1.74, half: 1.98 };
/** Head and shoulders, for the round chat avatars. */
const BUST = { cx: 0, cy: 2.2, half: 1.52 };
/** Head and cap with the ears, for the logo and the header peek. */
const HEAD = { cx: 0, cy: 2.3, half: 1.58 };

const STAGE_PX = 640;
const AVATAR_PX = 256;
const MARK_PX = 320;

// ─── Props ────────────────────────────────────────────────────────────────
function postcard() {
	const g = new THREE.Group();
	const card = roundedBox(0.8, 0.54, 0.035, 0.03, matte(COLOR.paper));
	g.add(card);
	const face = decal(0.76, 0.5, 256, (ctx, w, h) => {
		ctx.fillStyle = "#fbf8f1";
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = "#c9cbd6";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(w * 0.55, h * 0.16);
		ctx.lineTo(w * 0.55, h * 0.86);
		ctx.stroke();
		ctx.lineCap = "round";
		ctx.strokeStyle = "#5c5ee8";
		ctx.lineWidth = 14;
		for (const [y, x2] of [
			[0.36, 0.42],
			[0.52, 0.36],
			[0.68, 0.4],
		]) {
			ctx.beginPath();
			ctx.moveTo(w * 0.1, h * y);
			ctx.lineTo(w * x2, h * y);
			ctx.stroke();
		}
		ctx.strokeStyle = "#9a9db0";
		ctx.lineWidth = 6;
		for (const y of [0.56, 0.7]) {
			ctx.beginPath();
			ctx.moveTo(w * 0.62, h * y);
			ctx.lineTo(w * 0.88, h * y);
			ctx.stroke();
		}
		// Stamp.
		ctx.fillStyle = "#e2412d";
		const sx = w * 0.74;
		const sy = h * 0.12;
		ctx.fillRect(sx, sy, w * 0.16, h * 0.28);
		ctx.fillStyle = "#fbf8f1";
		for (let i = 0; i <= 6; i++) {
			for (const [x, y] of [
				[sx + (i / 6) * w * 0.16, sy],
				[sx + (i / 6) * w * 0.16, sy + h * 0.28],
			]) {
				ctx.beginPath();
				ctx.arc(x, y, 5, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	});
	face.position.z = 0.019;
	g.add(face);
	return g;
}

function sparkle(color = COLOR.indigo, size = 0.18) {
	const s = new THREE.Shape();
	const k = size;
	s.moveTo(0, k);
	s.quadraticCurveTo(0.12 * k, 0.12 * k, k, 0);
	s.quadraticCurveTo(0.12 * k, -0.12 * k, 0, -k);
	s.quadraticCurveTo(-0.12 * k, -0.12 * k, -k, 0);
	s.quadraticCurveTo(-0.12 * k, 0.12 * k, 0, k);
	return extruded(s, 0.03, 0.02, gloss(color));
}

function clipboard() {
	const g = new THREE.Group();
	g.add(
		roundedBox(1.0, 1.18, 0.06, 0.06, vinyl(COLOR.brown, { roughness: 0.5 })),
	);
	const paper = decal(0.84, 0.98, 512, (ctx, w, h) => {
		ctx.fillStyle = "#f6f6f4";
		ctx.fillRect(0, 0, w, h);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		for (const [i, len] of [
			[0, 0.34],
			[1, 0.28],
			[2, 0.32],
		]) {
			const y = h * (0.24 + i * 0.2);
			ctx.fillStyle = "#ffffff";
			ctx.strokeStyle = "#1c2152";
			ctx.lineWidth = 9;
			ctx.beginPath();
			ctx.roundRect(w * 0.1, y - 32, 64, 64, 12);
			ctx.fill();
			ctx.stroke();
			ctx.strokeStyle = "#5c5ee8";
			ctx.lineWidth = 12;
			ctx.beginPath();
			ctx.moveTo(w * 0.1 + 14, y + 2);
			ctx.lineTo(w * 0.1 + 28, y + 18);
			ctx.lineTo(w * 0.1 + 56, y - 22);
			ctx.stroke();
			ctx.strokeStyle = "#9a9db0";
			ctx.lineWidth = 14;
			ctx.beginPath();
			ctx.moveTo(w * 0.32, y);
			ctx.lineTo(w * (0.32 + len), y);
			ctx.stroke();
		}
		// The big green tick.
		ctx.strokeStyle = "#1f9d63";
		ctx.lineWidth = 18;
		ctx.beginPath();
		ctx.arc(w * 0.68, h * 0.8, 70, 0, Math.PI * 2);
		ctx.stroke();
		ctx.lineWidth = 20;
		ctx.beginPath();
		ctx.moveTo(w * 0.68 - 34, h * 0.8 + 2);
		ctx.lineTo(w * 0.68 - 8, h * 0.8 + 28);
		ctx.lineTo(w * 0.68 + 36, h * 0.8 - 30);
		ctx.stroke();
	});
	paper.position.set(0, -0.04, 0.034);
	g.add(paper);
	const clip = roundedBox(
		0.36,
		0.14,
		0.08,
		0.04,
		gloss(COLOR.steel, { metalness: 0.6, roughness: 0.25 }),
	);
	clip.position.set(0, 0.56, 0.05);
	g.add(clip);
	return g;
}

function foldedMap() {
	const g = new THREE.Group();
	const panelW = 0.62;
	const tex = (offset) => (ctx, w, h) => {
		ctx.fillStyle = "#e7f1e8";
		ctx.fillRect(0, 0, w, h);
		// Blocks of park and water.
		ctx.fillStyle = "#cfe6d3";
		ctx.fillRect(w * 0.08, h * 0.08, w * 0.4, h * 0.26);
		ctx.fillStyle = "#cfe0f7";
		ctx.fillRect(w * 0.55, h * 0.7, w * 0.4, h * 0.22);
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 9;
		for (let i = 1; i < 6; i++) {
			ctx.beginPath();
			ctx.moveTo(0, (h * i) / 6);
			ctx.lineTo(w, (h * i) / 6);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo((w * i) / 4, 0);
			ctx.lineTo((w * i) / 4, h);
			ctx.stroke();
		}
		ctx.strokeStyle = "#4a4bd0";
		ctx.lineWidth = 14;
		ctx.setLineDash([2, 26]);
		ctx.lineCap = "round";
		ctx.beginPath();
		for (let x = -10; x <= w + 10; x += 6) {
			const gx = x + offset * w;
			const y = h * 0.58 + Math.sin(gx / 90) * 40;
			if (x === -10) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	};
	for (const i of [-1, 0, 1]) {
		const panel = new THREE.Group();
		const board = roundedBox(panelW, 0.8, 0.02, 0.01, matte(0xe7f1e8));
		panel.add(board);
		const face = decal(panelW - 0.02, 0.78, 256, tex(i + 1));
		face.position.z = 0.012;
		panel.add(face);
		panel.position.set(i * (panelW - 0.02), 0, i === 0 ? 0.06 : 0);
		panel.rotation.y = i * -0.32;
		g.add(panel);
	}
	return g;
}

function magnifier() {
	const g = new THREE.Group();
	const gold = gloss(COLOR.gold, { metalness: 0.35, roughness: 0.25 });
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(0.27, 0.055, 24, 96),
		gold,
	);
	ring.castShadow = true;
	g.add(ring);
	const glass = new THREE.Mesh(
		new THREE.CircleGeometry(0.26, 64),
		new THREE.MeshPhysicalMaterial({
			color: 0xdfe9ff,
			transmission: 0,
			transparent: true,
			opacity: 0.35,
			roughness: 0.05,
			clearcoat: 1,
		}),
	);
	g.add(glass);
	// Map pin inside the glass.
	const pinShape = new THREE.Shape();
	pinShape.moveTo(0, -0.17);
	pinShape.bezierCurveTo(-0.04, -0.08, -0.12, -0.02, -0.12, 0.05);
	pinShape.absarc(0, 0.05, 0.12, Math.PI, 0, true);
	pinShape.bezierCurveTo(0.12, -0.02, 0.04, -0.08, 0, -0.17);
	const pin = extruded(pinShape, 0.04, 0.02, gloss(COLOR.red));
	pin.position.z = 0.02;
	g.add(pin);
	const dot = ellipsoid(0.045, 0.045, 0.02, gloss(0xffffff));
	dot.position.set(0, 0.04, 0.06);
	g.add(dot);
	const handle = capsule(0.055, 0.32, gold);
	handle.position.set(0.3, -0.3, 0);
	handle.rotation.z = Math.PI / 4;
	g.add(handle);
	return g;
}

function palette() {
	const g = new THREE.Group();
	const s = new THREE.Shape();
	s.moveTo(-0.55, 0);
	s.bezierCurveTo(-0.55, 0.32, -0.15, 0.4, 0.15, 0.36);
	s.bezierCurveTo(0.5, 0.32, 0.6, 0.08, 0.5, -0.12);
	s.bezierCurveTo(0.42, -0.28, 0.2, -0.18, 0.12, -0.26);
	s.bezierCurveTo(0.02, -0.38, -0.1, -0.38, -0.3, -0.32);
	s.bezierCurveTo(-0.5, -0.26, -0.55, -0.14, -0.55, 0);
	const hole = new THREE.Path();
	hole.absellipse(0.22, -0.06, 0.08, 0.06, 0, Math.PI * 2, true, 0);
	s.holes.push(hole);
	g.add(extruded(s, 0.04, 0.03, vinyl(0xe2c18e, { roughness: 0.45 })));
	for (const [x, y, c] of [
		[-0.36, 0.02, COLOR.red],
		[-0.2, 0.2, COLOR.indigo],
		[0.02, 0.24, COLOR.green],
		[0.26, 0.18, 0xfbfaf6],
		[-0.12, -0.2, 0xf2a03a],
	]) {
		const blob = ellipsoid(0.085, 0.075, 0.045, gloss(c));
		blob.position.set(x, y, 0.045);
		g.add(blob);
	}
	return g;
}

function brush() {
	const g = new THREE.Group();
	const handle = capsule(0.05, 1.0, gloss(COLOR.indigo));
	handle.rotation.z = Math.PI / 2;
	g.add(handle);
	const ferrule = shade(
		new THREE.Mesh(
			new THREE.CylinderGeometry(0.052, 0.045, 0.16, 32),
			gloss(COLOR.steel, { metalness: 0.7, roughness: 0.2 }),
		),
	);
	ferrule.rotation.z = Math.PI / 2;
	ferrule.position.x = 0.58;
	g.add(ferrule);
	const tip = shade(
		new THREE.Mesh(
			new THREE.ConeGeometry(0.055, 0.24, 32),
			vinyl(0x3f3a8a, { roughness: 0.6 }),
		),
	);
	tip.rotation.z = -Math.PI / 2;
	tip.position.x = 0.78;
	g.add(tip);
	return g;
}

function headset() {
	const g = new THREE.Group();
	const band = tube(
		Array.from({ length: 9 }, (_, i) => {
			const a = Math.PI * (i / 8);
			return new THREE.Vector3(
				-Math.cos(a) * 1.22,
				0.3 + Math.sin(a) * 1.16,
				0.0,
			);
		}),
		0.07,
		gloss(COLOR.indigo),
	);
	g.add(band);
	for (const side of [-1, 1]) {
		const cup = shade(
			new THREE.Mesh(
				new THREE.CylinderGeometry(0.3, 0.3, 0.2, 48),
				gloss(COLOR.indigo),
			),
		);
		cup.rotation.z = Math.PI / 2;
		cup.position.set(1.16 * side, 0.18, 0.02);
		g.add(cup);
		const cushion = shade(
			new THREE.Mesh(
				new THREE.TorusGeometry(0.22, 0.07, 16, 48),
				vinyl(COLOR.navy),
			),
		);
		cushion.rotation.y = Math.PI / 2;
		cushion.position.set(1.04 * side, 0.18, 0.02);
		g.add(cushion);
	}
	const boom = tube(
		[
			new THREE.Vector3(-1.2, 0.08, 0.15),
			new THREE.Vector3(-1.05, -0.35, 0.55),
			new THREE.Vector3(-0.62, -0.55, 0.92),
		],
		0.035,
		gloss(COLOR.navy),
	);
	g.add(boom);
	const mic = ellipsoid(0.1, 0.1, 0.1, gloss(COLOR.indigo));
	mic.position.set(-0.58, -0.56, 0.95);
	g.add(mic);
	return g;
}

function envelope() {
	const g = new THREE.Group();
	g.add(roundedBox(0.72, 0.5, 0.06, 0.04, matte(0xf7f3ea)));
	const flap = tube(
		[
			new THREE.Vector3(-0.32, 0.2, 0.036),
			new THREE.Vector3(0, -0.06, 0.04),
			new THREE.Vector3(0.32, 0.2, 0.036),
		],
		0.014,
		vinyl(0xc9c2b2),
	);
	g.add(flap);
	return g;
}

function bulb() {
	const g = new THREE.Group();
	const glass = ellipsoid(
		0.24,
		0.26,
		0.24,
		new THREE.MeshPhysicalMaterial({
			color: 0xffd65c,
			emissive: 0xffc93a,
			emissiveIntensity: 0.9,
			roughness: 0.15,
			clearcoat: 1,
		}),
	);
	g.add(glass);
	const base = shade(
		new THREE.Mesh(
			new THREE.CylinderGeometry(0.11, 0.1, 0.16, 32),
			gloss(COLOR.steel, { metalness: 0.6 }),
		),
	);
	base.position.y = -0.3;
	g.add(base);
	// Rays.
	for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
		const ray = capsule(
			0.022,
			0.12,
			gloss(COLOR.gold, { emissive: 0xffc93a, emissiveIntensity: 0.4 }),
		);
		ray.position.set(Math.sin(a) * 0.42, Math.cos(a) * 0.42, 0);
		ray.rotation.z = -a;
		g.add(ray);
	}
	return g;
}

// ─── Poses ────────────────────────────────────────────────────────────────
const at = (obj, [x, y, z], rot = [0, 0, 0]) => {
	obj.position.set(x, y, z);
	obj.rotation.set(...rot);
	return obj;
};

export const POSES = {
	/** `mail`: waving a postcard, satchel on (campaigns, scans, rewards). */
	mail: () => {
		const s = buildStampy({
			leftHand: [-1.16, 1.42, 0.42],
			rightHand: [0.74, 0.64, 0.22],
		});
		const card = at(postcard(), [-0.08, 0.36, 0.05], [0, 0.25, 0.22]);
		s.userData.arms.left.userData.paw.add(card);
		s.add(at(sparkle(), [-1.66, 2.1, 0.5], [0, 0.2, 0.3]));
		s.add(at(sparkle(COLOR.gold, 0.1), [-1.75, 1.45, 0.4]));
		return [
			{
				file: "stampy-mail.webp",
				object: s,
				frame: { ...FULL, cx: -0.12 },
				size: STAGE_PX,
			},
		];
	},
	/** `audience`: the map and magnifier (audiences, recipients). */
	audience: () => {
		const s = buildStampy({
			leftHand: [-0.86, 1.0, 0.98],
			rightHand: [0.66, 0.72, 1.22],
			satchel: false,
			brows: "focused",
		});
		s.add(at(foldedMap(), [0, 0.92, 0.95], [-0.1, 0, 0]));
		s.add(at(magnifier(), [0.4, 1.0, 1.28], [-0.05, -0.15, 0.1]));
		return [
			{ file: "stampy-audience.webp", object: s, frame: FULL, size: STAGE_PX },
		];
	},
	/** `design`: beret, brush in his mouth, palette (designs, drafts). */
	design: () => {
		const s = buildStampy({
			hat: "beret",
			mouth: "closed",
			leftHand: [-0.7, 0.9, 0.72],
			rightHand: [0.74, 0.64, 0.22],
		});
		s.add(at(palette(), [-0.62, 0.86, 0.86], [-0.35, 0.35, 0.2]));
		s.add(at(brush(), [-0.08, 1.78, 1.2], [0, 0, 0.06]));
		return [
			{ file: "stampy-design.webp", object: s, frame: FULL, size: STAGE_PX },
		];
	},
	/** `checklist`: a ticked clipboard (logs, inboxes, checks passed). */
	checklist: () => {
		const s = buildStampy({
			leftHand: [-0.56, 1.0, 0.86],
			rightHand: [0.56, 1.0, 0.86],
		});
		s.add(at(clipboard(), [0, 0.92, 0.74], [-0.14, 0, 0]));
		return [
			{ file: "stampy-checklist.webp", object: s, frame: FULL, size: STAGE_PX },
		];
	},
	/** Chat avatar: headset on, ready to help. */
	"avatar-idle": () => {
		const s = buildStampy({ satchel: false });
		s.userData.head.add(headset());
		return [
			{
				file: "stampy-avatar-idle.webp",
				object: s,
				frame: BUST,
				size: AVATAR_PX,
				view: { yaw: 0.12, pitch: 0.04 },
			},
		];
	},
	/** Chat avatar while a reply is on its way: paw at his chin. */
	"avatar-thinking": () => {
		const s = buildStampy({
			satchel: false,
			mouth: "closed",
			brows: "raised",
			headTilt: 0.12,
			rightHand: [0.32, 1.56, 0.98],
		});
		s.userData.head.add(headset());
		return [
			{
				file: "stampy-avatar-thinking.webp",
				object: s,
				frame: BUST,
				size: AVATAR_PX,
				view: { yaw: 0.12, pitch: 0.04 },
			},
		];
	},
	/** Chat avatar for tips: an idea and a letter. */
	"avatar-tip": () => {
		const s = buildStampy({ satchel: false, rightHand: [0.82, 1.3, 0.8] });
		s.userData.arms.right.userData.paw.add(
			at(envelope(), [0.02, 0.28, 0.06], [0, -0.2, -0.15]),
		);
		s.add(at(bulb(), [1.28, 3.02, 0.55], [0, 0, -0.25]));
		return [
			{
				file: "stampy-avatar-tip.webp",
				object: s,
				frame: { ...BUST, cx: 0.16 },
				size: AVATAR_PX,
				view: { yaw: 0.12, pitch: 0.04 },
			},
		];
	},
	/** The head with its cap: the logo and the header peek. */
	head: () => {
		const g = new THREE.Group();
		const h = new THREE.Group();
		h.position.y = 2.2;
		h.add(buildHead());
		h.add(buildCap());
		g.add(h);
		return [
			{
				file: "stampy-head.webp",
				object: g,
				frame: HEAD,
				size: MARK_PX,
				view: { yaw: 0, pitch: 0.02 },
			},
		];
	},
	/** One paw gripping an edge, for the header peek (mirrored for the other). */
	paw: () => {
		const g = new THREE.Group();
		g.add(at(paw(), [0, 0, 0], [0.5, 0, 0]));
		return [
			{
				file: "stampy-paw.webp",
				object: g,
				frame: { cx: 0, cy: 0, half: 0.27 },
				size: 128,
				view: { yaw: 0, pitch: 0.3 },
			},
		];
	},
};

export function renderPose(name) {
	return POSES[name]().map(({ file, object, frame, size, view }) => ({
		file,
		dataUrl: renderObject(object, frame, size, view),
	}));
}
