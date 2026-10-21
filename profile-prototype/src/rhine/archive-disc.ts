import * as THREE from "three";

/** The assembly asset separates the old rings from the case they shared in the cassette asset. */
export function isReplacedInterior(part: unknown, surface: string) {
  return part === "optical-core" || part === "optical-lenses" ||
    (part === "substrate" && surface === "Internal_Ceramic");
}

/** A solid optical disc: no animated noise, extra render passes or layered glass. */
export function createArchiveDisc() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1.34, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.165, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const body = new THREE.ExtrudeGeometry(shape, { depth: 0.024, bevelEnabled: false, curveSegments: 64 });
  const definitions = [
    { name: "Disc_Body", part: "optical-core", geometry: body, z: 0.025, color: "#c0c3c2", metalness: 0.6, roughness: 0.34 },
    { name: "Disc_Recording", part: "optical-lenses", geometry: new THREE.RingGeometry(0.37, 1.31, 128, 4), z: 0.057, color: "#f1f1eb", metalness: 0.32, roughness: 0.3 },
    { name: "Disc_Hub", part: "optical-core", geometry: new THREE.RingGeometry(0.165, 0.36, 96), z: 0.058, color: "#969e9e", metalness: 0.45, roughness: 0.38 },
  ];
  return definitions.map(({ name, part, geometry, z, color, metalness, roughness }) => {
    if (name === "Disc_Recording") {
      const positions = geometry.getAttribute("position");
      const colors = new Float32Array(positions.count * 3);
      const silver = new THREE.Color();
      for (let i = 0; i < positions.count; i++) {
        const angle = Math.atan2(positions.getY(i), positions.getX(i));
        // Broad baked reflection bands stay attached to the disc, not screen pixels.
        silver.setHSL((angle / (Math.PI * 2) + 1) % 1, 0.14, 0.73 + 0.12 * Math.cos(angle * 2 + 0.7));
        silver.toArray(colors, i * 3);
      }
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    const material = new THREE.MeshPhysicalMaterial({ name, color, metalness, roughness, side: THREE.DoubleSide,
      vertexColors: name === "Disc_Recording",
      // Broad, restrained interference; no fine grooves that shimmer while moving.
      iridescence: name === "Disc_Recording" ? 0.32 : 0,
      iridescenceIOR: 1.35, iridescenceThicknessRange: [280, 380], envMapIntensity: 0.65 });
    geometry.translate(0.28, 1.75, z);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.surface = name;
    mesh.userData.assemblyPart = part;
    mesh.receiveShadow = true;
    return mesh;
  });
}
