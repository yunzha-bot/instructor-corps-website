import * as THREE from "three";

/** Display a canvas texture as native-resolution DOM content, projected onto its 3D plane. */
export class NativeCanvasOverlay {
  readonly element: HTMLDivElement;
  private readonly ink: HTMLDivElement;
  private readonly width: number;
  private readonly height: number;

  constructor(canvas: HTMLCanvasElement, host: HTMLElement) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.element = document.createElement("div");
    this.element.className = "native-canvas-overlay";
    Object.assign(this.element.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${this.width}px`,
      height: `${this.height}px`,
      transformOrigin: "0 0",
      pointerEvents: "none",
      overflow: "hidden",
      visibility: "hidden",
      zIndex: "1",
      willChange: "transform, clip-path",
    });
    Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
    this.element.append(canvas);
    this.ink = document.createElement("div");
    Object.assign(this.ink.style, {
      position: "absolute",
      background: "#0b0c0a",
      pointerEvents: "none",
    });
    this.element.append(this.ink);
    host.append(this.element);
  }

  update(
    mesh: THREE.Mesh,
    camera: THREE.Camera,
    viewport: HTMLElement,
    enabled: boolean,
    reveal: { width: number; height: number },
    opacity = 1,
  ) {
    this.element.style.visibility = enabled && reveal.width > 0 && reveal.height > 0
      ? "visible"
      : "hidden";
    if (!enabled) return;

    mesh.updateWorldMatrix(true, false);
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox!;
    const corners = [
      [bounds.min.x, bounds.max.y],
      [bounds.max.x, bounds.max.y],
      [bounds.max.x, bounds.min.y],
      [bounds.min.x, bounds.min.y],
    ].map(([x, y]) => {
      const p = new THREE.Vector3(x, y, 0).applyMatrix4(mesh.matrixWorld).project(camera);
      return [(p.x + 1) * viewport.clientWidth / 2, (1 - p.y) * viewport.clientHeight / 2] as const;
    });
    const matrix = homography(this.width, this.height, corners);
    if (matrix) {
      this.element.style.transform = `matrix3d(${matrix.map(value => Number(value.toFixed(7))).join(",")})`;
    }

    const width = THREE.MathUtils.clamp(reveal.width, 0, 1);
    const height = THREE.MathUtils.clamp(reveal.height, 0, 1);
    this.element.style.opacity = String(THREE.MathUtils.clamp(opacity, 0, 1));
    const insetY = (1 - height) * 50;
    const insetX = (1 - width) * 50;
    this.element.style.clipPath = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}%)`;
    Object.assign(this.ink.style, {
      left: `${insetX}%`,
      top: `${insetY}%`,
      width: `${width * 100}%`,
      height: `${height * 100}%`,
      opacity: String(1 - smoothstep((height - 0.008) / 0.16)),
    });
  }

  dispose() {
    this.element.remove();
  }
}

function smoothstep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function homography(width: number, height: number, points: readonly (readonly [number, number])[]) {
  const source = [[0, 0], [width, 0], [width, height], [0, height]];
  const rows: number[][] = [];
  source.forEach(([x, y], index) => {
    const [u, v] = points[index];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++)
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    if (Math.abs(rows[pivot][column]) < 1e-9) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let j = column; j <= 8; j++) rows[column][j] /= divisor;
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let j = column; j <= 8; j++) rows[row][j] -= factor * rows[column][j];
    }
  }
  const [a, b, c, d, e, f, g, h] = rows.map(row => row[8]);
  // CSS matrix3d uses column-major order. This is the planar projective map
  // from the texture's pixel coordinates to the four projected 3D corners.
  return [a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1];
}
