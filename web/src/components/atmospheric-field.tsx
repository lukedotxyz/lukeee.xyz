import { useEffect, useRef } from 'react';

const WAVE_COUNT = 8;
const WAVE_DURATION = 2.8;
const MARK_SIZE = 256;
const MAX_PIXEL_RATIO = 1.5;
const RESTING_POINTER = { x: 0.38, y: 0.56 };

const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentSource = `
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform vec2 u_mark_texel;
uniform sampler2D u_marks;
uniform vec4 u_drag;
uniform float u_drag_strength;
uniform float u_time;

const int WAVE_COUNT = ${WAVE_COUNT};
uniform vec4 u_waves[WAVE_COUNT];

varying vec2 v_uv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.82, -0.57, 0.57, 0.82);

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = rotation * p * 2.03 + 11.7;
    amplitude *= 0.5;
  }

  return value;
}

float sandHeight(vec2 p) {
  float broad = (fbm(p * vec2(0.32, 0.74)) - 0.5) * 0.055;
  float wind = sin(p.y * 7.4 + p.x * 1.08 + noise(p * 0.88) * 4.2) * 0.008;
  return broad + wind;
}

float waterHeight(vec2 p, float time) {
  float a = sin(p.x * 2.55 + p.y * 1.35 - time * 0.78);
  float b = sin(-p.x * 1.68 + p.y * 3.05 + time * 0.54);
  float c = sin(p.x * 5.1 + p.y * 0.82 - time * 0.32);
  return a * 0.038 + b * 0.025 + c * 0.012;
}

float waterSparkle(vec2 p, float time) {
  vec2 cells = p * vec2(3.1, 1.65);
  vec2 id = floor(cells);
  vec2 local = fract(cells);
  vec2 point = 0.16 + vec2(hash21(id + 4.2), hash21(id + 17.7)) * 0.68;
  float distance = length((local - point) * vec2(1.0, 0.58));
  float gate = step(0.78, hash21(id + 31.4));
  float phase = hash21(id + 72.1) * 6.28318;
  float twinkle = pow(0.5 + 0.5 * sin(time * (1.2 + hash21(id) * 1.8) + phase), 7.0);
  return smoothstep(0.075, 0.0, distance) * gate * (0.16 + twinkle * 0.84);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float warmth = smoothstep(0.05, 0.95, u_pointer.x + sin(u_time * 0.045) * 0.04);
  float horizon = 0.57 + (u_pointer.y - 0.5) * 0.018;
  float horizonNoise = (fbm(vec2((uv.x - 0.5) * 2.3 + u_time * 0.004, uv.y * 3.7)) - 0.5) * 0.032;
  float groundAmount = 1.0 - smoothstep(
    horizon - 0.025 + horizonNoise,
    horizon + 0.045 + horizonNoise,
    uv.y
  );
  float grain = hash21(floor(gl_FragCoord.xy));
  float coarseGrain = hash21(floor(gl_FragCoord.xy * 0.5));

  vec4 mark = texture2D(u_marks, uv);
  float markLeft = texture2D(u_marks, uv - vec2(u_mark_texel.x, 0.0)).a;
  float markRight = texture2D(u_marks, uv + vec2(u_mark_texel.x, 0.0)).a;
  float markBelow = texture2D(u_marks, uv - vec2(0.0, u_mark_texel.y)).a;
  float markAbove = texture2D(u_marks, uv + vec2(0.0, u_mark_texel.y)).a;
  vec2 markGradient = vec2(markRight - markLeft, markAbove - markBelow);
  float memory = smoothstep(0.008, 0.7, mark.a);
  vec2 memoryFlow = (mark.rg * 2.0 - 1.0) * memory;

  vec2 dragVelocity = u_drag.zw * vec2(aspect, 1.0);
  float dragSpeed = length(dragVelocity);
  vec2 dragDirection = dragVelocity / max(dragSpeed, 0.0001);
  vec2 dragDelta = (uv - u_drag.xy) * vec2(aspect, 1.0);
  vec2 wakeDelta = dragDelta + dragDirection * 0.035;
  float wakeAlong = dot(wakeDelta, dragDirection);
  float wakeAcross = dot(wakeDelta, vec2(-dragDirection.y, dragDirection.x));
  float wakeForward = max(wakeAlong, 0.0);
  float wakeBehind = max(-wakeAlong, 0.0);
  float wakeDistance = wakeAcross * wakeAcross * 138.0
    + wakeForward * wakeForward * 260.0
    + wakeBehind * wakeBehind * 24.0;
  float wakeNoise = noise(vec2(
    wakeAcross * 15.0 + u_time * 0.11,
    wakeBehind * 7.0 - u_time * 0.17
  ) + u_drag.xy * 9.0);
  float wakeFilaments = mix(0.3, 1.0, smoothstep(0.14, 0.86, wakeNoise));
  float dragInfluence = exp(-wakeDistance)
    * wakeFilaments
    * u_drag_strength
    * smoothstep(0.04, 0.34, dragSpeed);
  vec2 screenForce = markGradient * 0.045 + memoryFlow * 0.012;
  screenForce += u_drag.zw * dragInfluence * 0.009;
  vec2 projectedUv = uv + screenForce;

  float elevation = max(horizon - projectedUv.y, 0.012);
  float worldZ = 0.72 / elevation;
  float worldX = (projectedUv.x - 0.5) * aspect * worldZ;
  vec2 ground = vec2(worldX, worldZ);
  ground.x += (u_pointer.x - 0.5) * mix(0.58, 0.12, smoothstep(1.2, 18.0, worldZ));

  float shore = 3.4
    + (fbm(vec2(ground.x * 0.23, u_time * 0.011)) - 0.5) * 1.65
    + sin(ground.x * 0.31 + u_time * 0.018) * 0.28;
  float waterAmount = smoothstep(shore - 0.62, shore + 0.78, ground.y);
  ground += u_drag.zw * dragInfluence * mix(0.09, 0.24, waterAmount);

  vec2 worldForce = vec2(0.0);
  float sandImpact = 0.0;
  float waterImpact = 0.0;
  float skyImpact = 0.0;
  float groundImpactTone = 0.0;
  float skyImpactTone = 0.0;

  for (int i = 0; i < WAVE_COUNT; i++) {
    vec4 wave = u_waves[i];
    float age = wave.z;
    float seed = wave.w;
    float life = 1.0 - smoothstep(0.0, ${WAVE_DURATION.toFixed(1)}, age);

    if (wave.y < horizon) {
      float waveElevation = max(horizon - wave.y, 0.012);
      float waveZ = 0.72 / waveElevation;
      float waveX = (wave.x - 0.5) * aspect * waveZ;
      vec2 waveGround = vec2(waveX, waveZ);
      float waveShore = 3.4
        + (fbm(vec2(waveX * 0.23, u_time * 0.011)) - 0.5) * 1.65
        + sin(waveX * 0.31 + u_time * 0.018) * 0.28;
      float originWater = smoothstep(waveShore - 0.6, waveShore + 0.8, waveZ);
      vec2 delta = ground + worldForce * 0.18 - waveGround;
      float fieldNoise = noise(ground * mix(0.72, 1.15, waterAmount) + seed * 29.0);
      float distance = length(delta * vec2(0.78, 1.0));
      distance *= 1.0 + (fieldNoise - 0.5) * mix(0.5, 0.34, waterAmount);
      float radius = age * mix(0.42, 0.9, originWater) * mix(0.86, 1.14, seed);
      float width = mix(0.27, 0.18, waterAmount) * (1.0 + age * 0.34);
      float fracture = noise(ground * 2.7 + seed * 47.0);
      fracture = mix(0.28, 1.0, smoothstep(0.18, 0.82, fracture));
      float edge = exp(-pow((distance - radius) / width, 2.0)) * life * fracture;
      vec2 direction = normalize(ground - waveGround + vec2(0.0001));

      worldForce += direction * edge * mix(0.08, 0.15, waterAmount);
      sandImpact = 1.0 - (1.0 - sandImpact) * (1.0 - edge * (1.0 - waterAmount));
      waterImpact = 1.0 - (1.0 - waterImpact) * (1.0 - edge * waterAmount);
      groundImpactTone += edge * (seed - 0.5) * 0.55;
    } else {
      vec2 waveDelta = (uv - wave.xy) * vec2(aspect, 1.0);
      float skyNoise = noise(waveDelta * 9.0 + seed * 31.0);
      float distance = length(waveDelta * vec2(0.72, 1.0));
      distance *= 1.0 + (skyNoise - 0.5) * 0.6;
      float radius = age * 0.115;
      float width = 0.04 + age * 0.018;
      float edge = exp(-pow((distance - radius) / width, 2.0)) * life;
      skyImpact = 1.0 - (1.0 - skyImpact) * (1.0 - edge);
      skyImpactTone += edge * (seed - 0.35) * 0.45;
    }
  }

  ground += worldForce;
  vec2 sandPoint = ground + markGradient * vec2(0.85, 0.42);
  float sandEpsilon = 0.035;
  float sandCenter = sandHeight(sandPoint) + sandImpact * 0.08 + memory * 0.014;
  sandCenter += (noise(sandPoint * 11.0) - 0.5) * dragInfluence * 0.018;
  float sandX = sandHeight(sandPoint + vec2(sandEpsilon, 0.0));
  float sandZ = sandHeight(sandPoint + vec2(0.0, sandEpsilon));
  vec3 sandNormal = normalize(vec3(
    (sandCenter - sandX) / sandEpsilon,
    1.0,
    (sandCenter - sandZ) / sandEpsilon
  ));

  vec3 lightDirection = normalize(vec3(
    (u_pointer.x - 0.5) * 1.5,
    0.82,
    0.36 + u_pointer.y * 0.38
  ));
  float sandLight = 0.72 + max(dot(sandNormal, lightDirection), 0.0) * 0.28;
  float sandFine = noise(sandPoint * vec2(24.0, 39.0));
  float sandMedium = noise(sandPoint * vec2(71.0, 109.0) + sandFine * 2.7);
  float sandMicro = noise(sandPoint * vec2(183.0, 239.0) + sandMedium * 3.4);
  vec2 sandCell = floor(sandPoint * vec2(137.0, 191.0));
  float raisedGrain = smoothstep(0.86, 0.99, hash21(sandCell));
  float pittedGrain = smoothstep(0.91, 0.997, hash21(sandCell * 1.17 + 41.7));
  float sandRidge = sin(sandPoint.y * 8.2 + sandPoint.x * 1.15 + sandFine * 3.8);
  vec3 sandNear = mix(vec3(0.72, 0.71, 0.66), vec3(0.8, 0.74, 0.66), warmth);
  vec3 sandFar = mix(vec3(0.82, 0.81, 0.76), vec3(0.88, 0.82, 0.75), warmth);
  vec3 sandColor = mix(sandNear, sandFar, smoothstep(1.3, 8.0, ground.y));
  sandColor *= sandLight;
  sandColor += (sandFine - 0.5) * 0.026;
  sandColor += (sandMedium - 0.5) * 0.031;
  sandColor += (sandMicro - 0.5) * 0.018;
  sandColor += raisedGrain * 0.034;
  sandColor -= pittedGrain * 0.022;
  sandColor -= max(sandRidge, 0.0) * 0.009;
  sandColor += sandImpact * mix(vec3(0.028, 0.032, 0.03), vec3(0.045, 0.03, 0.018), warmth);

  vec2 waterPoint = ground + worldForce * 0.5 + markGradient * 0.4;
  waterPoint += u_drag.zw * dragInfluence * 0.18;
  float waterEpsilon = 0.045;
  float dragWake = dragInfluence * waterAmount * min(length(u_drag.zw), 1.0);
  float waterCenter = waterHeight(waterPoint, u_time) + waterImpact * 0.07;
  float waterX = waterHeight(waterPoint + vec2(waterEpsilon, 0.0), u_time);
  float waterZ = waterHeight(waterPoint + vec2(0.0, waterEpsilon), u_time);
  vec3 waterNormal = normalize(vec3(
    (waterCenter - waterX) / waterEpsilon,
    1.0,
    (waterCenter - waterZ) / waterEpsilon
  ));
  float waterLight = max(dot(waterNormal, lightDirection), 0.0);
  float fresnel = pow(1.0 - clamp(waterNormal.y, 0.0, 1.0), 2.0);
  vec3 waterDeep = mix(vec3(0.46, 0.6, 0.65), vec3(0.61, 0.66, 0.65), warmth);
  vec3 waterPale = mix(vec3(0.74, 0.81, 0.82), vec3(0.84, 0.77, 0.7), warmth);
  vec3 waterColor = mix(waterDeep, waterPale, 0.38 + waterLight * 0.42 + fresnel * 0.2);
  float sparkle = waterSparkle(waterPoint + worldForce * 1.4, u_time);
  sparkle += waterSparkle(waterPoint * 1.7 - 13.2, u_time * 0.73) * 0.42;
  sparkle *= mix(1.0, 0.74 + wakeNoise * 0.34, dragWake);
  waterColor += sparkle * (0.18 + waterLight * 0.38);
  waterColor += waterImpact * mix(vec3(0.07, 0.11, 0.13), vec3(0.13, 0.08, 0.045), warmth);

  float distanceHaze = smoothstep(5.0, 28.0, ground.y);
  vec3 horizonColor = mix(vec3(0.82, 0.83, 0.81), vec3(0.92, 0.8, 0.74), warmth);
  vec3 groundColor = mix(sandColor, waterColor, waterAmount);
  groundColor = mix(groundColor, horizonColor, distanceHaze * 0.82);

  float skyHeight = clamp((uv.y - horizon) / max(1.0 - horizon, 0.01), 0.0, 1.0);
  vec2 skyPoint = vec2(
    (uv.x - 0.5) * aspect - (u_pointer.x - 0.5) * 0.025,
    skyHeight
  );
  skyPoint += markGradient * 0.07;
  skyPoint += u_drag.zw * dragInfluence * 0.018;
  float wispField = fbm(vec2(
    skyPoint.x * 0.95 + skyPoint.y * 0.46 - u_time * 0.009,
    skyPoint.y * 6.8 + noise(skyPoint * 1.8) * 0.55
  ));
  float wispBreak = noise(vec2(skyPoint.x * 4.2 - u_time * 0.016, skyPoint.y * 2.0));
  float wisps = smoothstep(0.55, 0.76, wispField + (wispBreak - 0.5) * 0.18 + skyImpact * 0.12);
  vec3 skyLow = horizonColor;
  vec3 skyHigh = mix(vec3(0.72, 0.8, 0.84), vec3(0.92, 0.72, 0.7), warmth);
  vec3 skyColor = mix(skyLow, skyHigh, smoothstep(0.0, 0.78, skyHeight));
  vec3 wispColor = mix(vec3(0.9, 0.91, 0.88), vec3(0.98, 0.82, 0.77), warmth);
  skyColor = mix(skyColor, wispColor, wisps * (0.22 + skyHeight * 0.16));
  skyColor += skyImpact * mix(vec3(0.025, 0.04, 0.05), vec3(0.055, 0.025, 0.012), warmth);

  vec3 color = mix(skyColor, groundColor, groundAmount);
  float impactTone = mix(skyImpactTone, groundImpactTone, groundAmount);
  color += impactTone * mix(vec3(0.025, 0.04, 0.05), vec3(0.05, 0.024, 0.008), warmth);
  color += (grain - 0.5) * mix(0.026, 0.046, groundAmount);
  color += (coarseGrain - 0.5) * 0.016;

  float levels = mix(118.0, 168.0, coarseGrain);
  color = floor(color * levels + grain) / levels;
  float vignette = dot((uv - 0.5) * vec2(0.72, 1.0), (uv - 0.5) * vec2(0.72, 1.0));
  color *= 1.0 - smoothstep(0.18, 0.62, vignette) * 0.1;
  color = pow(max(color, 0.0), vec3(0.95));

  gl_FragColor = vec4(color, 1.0);
}
`;

type Point = { x: number; y: number };

type Wave = Point & {
  seed: number;
  startedAt: number;
};

function hash(value: number) {
  return Math.abs(Math.sin(value) * 43758.5453) % 1;
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }

  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function createErosionPattern() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');

  if (!context) return null;

  const image = context.createImageData(canvas.width, canvas.height);

  for (let index = 0; index < canvas.width * canvas.height; index += 1) {
    image.data[index * 4 + 3] = 42 + Math.round(hash(index * 0.754877) * 213);
  }

  context.putImageData(image, 0, 0);
  return canvas;
}

function paintSplat(
  context: CanvasRenderingContext2D,
  point: Point,
  seed: number,
) {
  context.save();
  context.translate(point.x * MARK_SIZE, (1 - point.y) * MARK_SIZE);
  context.globalCompositeOperation = 'lighter';

  for (let index = 0; index < 28; index += 1) {
    const character = hash(seed * 91.7 + index * 17.13);
    const angle = hash(seed * 53.1 + index * 7.9) * Math.PI * 2;
    const radius = MARK_SIZE * (0.004 + character * 0.042);
    const size = MARK_SIZE * (0.002 + hash(seed * 31.4 + index) * 0.006);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * (0.65 + seed * 0.45);

    context.fillStyle = `rgba(128, 128, ${100 + Math.round(character * 90)}, ${0.018 + character * 0.035})`;
    context.beginPath();
    context.ellipse(x, y, size * 1.45, size, angle, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function paintDrag(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  seed: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance * MARK_SIZE * 0.42));
  const directionX = distance > 0 ? dx / distance : 0;
  const directionY = distance > 0 ? dy / distance : 0;
  const red = Math.round((directionX * 0.5 + 0.5) * 255);
  const green = Math.round((directionY * 0.5 + 0.5) * 255);
  const angle = Math.atan2(-dy, dx);

  context.save();
  context.globalCompositeOperation = 'source-over';
  context.strokeStyle = `rgba(${red}, ${green}, 132, 0.028)`;
  context.lineWidth = MARK_SIZE * 0.012;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(from.x * MARK_SIZE, (1 - from.y) * MARK_SIZE);
  context.lineTo(to.x * MARK_SIZE, (1 - to.y) * MARK_SIZE);
  context.stroke();

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const character = hash(seed * 83.1 + step * 12.7);
    const x = (from.x + (to.x - from.x) * progress) * MARK_SIZE;
    const y = (1 - (from.y + (to.y - from.y) * progress)) * MARK_SIZE;
    const spread = (character - 0.5) * MARK_SIZE * 0.022;
    const size = MARK_SIZE * (0.002 + character * 0.004);

    context.fillStyle = `rgba(${red}, ${green}, ${110 + Math.round(character * 60)}, ${0.012 + character * 0.024})`;
    context.beginPath();
    context.ellipse(
      x - Math.sin(angle) * spread,
      y + Math.cos(angle) * spread,
      size * 2.1,
      size,
      angle,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.restore();
}

export function AtmosphericField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
    });

    if (!canvas || !gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const locations = {
      position: gl.getAttribLocation(program, 'a_position'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      pointer: gl.getUniformLocation(program, 'u_pointer'),
      markTexel: gl.getUniformLocation(program, 'u_mark_texel'),
      marks: gl.getUniformLocation(program, 'u_marks'),
      drag: gl.getUniformLocation(program, 'u_drag'),
      dragStrength: gl.getUniformLocation(program, 'u_drag_strength'),
      time: gl.getUniformLocation(program, 'u_time'),
      waves: gl.getUniformLocation(program, 'u_waves[0]'),
    };
    const buffer = gl.createBuffer();
    const markTexture = gl.createTexture();
    const markCanvas = document.createElement('canvas');
    const flowCanvas = document.createElement('canvas');
    markCanvas.width = flowCanvas.width = MARK_SIZE;
    markCanvas.height = flowCanvas.height = MARK_SIZE;
    const markContext = markCanvas.getContext('2d');
    const flowContext = flowCanvas.getContext('2d');
    const erosionCanvas = createErosionPattern();
    const erosionPattern = erosionCanvas
      ? markContext?.createPattern(erosionCanvas, 'repeat')
      : null;

    if (
      locations.position < 0 ||
      Object.values(locations).some((location) => location === null) ||
      !buffer ||
      !markTexture ||
      !markContext ||
      !flowContext ||
      !erosionPattern
    ) {
      if (buffer) gl.deleteBuffer(buffer);
      if (markTexture) gl.deleteTexture(markTexture);
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, markTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      markCanvas,
    );
    gl.uniform1i(locations.marks, 0);
    gl.uniform2f(locations.markTexel, 1 / MARK_SIZE, 1 / MARK_SIZE);

    const startedAt = performance.now();
    const pointer = { ...RESTING_POINTER };
    const target = { ...RESTING_POINTER };
    const waves: Wave[] = Array.from({ length: WAVE_COUNT }, (_, index) => ({
      ...RESTING_POINTER,
      seed: index / WAVE_COUNT,
      startedAt: startedAt - WAVE_DURATION * 1000,
    }));
    const waveData = new Float32Array(WAVE_COUNT * 4);
    const drag = {
      point: { ...RESTING_POINTER },
      velocity: { x: 0, y: 0 },
      strength: 0,
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;
    let activePointerId: number | null = null;
    let dragMoved = false;
    let dragStartedAt = startedAt;
    let impactSequence = 0;
    let lastDragPoint: Point | null = null;
    let lastDragAt = startedAt;
    let lastInputAt = startedAt;
    let lastMapUpdate = startedAt;
    let lastMarkAt = startedAt - 60000;
    let waveCursor = 0;
    let summonedTides = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        MAX_PIXEL_RATIO,
      );
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const positionFromEvent = (event: PointerEvent): Point => {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: Math.min(
          1,
          Math.max(0, (event.clientX - bounds.left) / bounds.width),
        ),
        y: Math.min(
          1,
          Math.max(0, 1 - (event.clientY - bounds.top) / bounds.height),
        ),
      };
    };

    const addWave = (point: Point) => {
      const signature =
        point.x * 12.9898 + point.y * 78.233 + impactSequence * 37.719;
      const seed = hash(signature);
      const now = performance.now();

      waves[waveCursor] = { ...point, seed, startedAt: now };
      waveCursor = (waveCursor + 1) % WAVE_COUNT;
      impactSequence += 1;
      paintSplat(markContext, point, seed);
      lastMarkAt = now;
    };

    const movePointer = (event: PointerEvent) => {
      const point = positionFromEvent(event);
      const now = performance.now();
      target.x = point.x;
      target.y = point.y;
      lastInputAt = now;

      if (activePointerId === event.pointerId && lastDragPoint) {
        const bounds = canvas.getBoundingClientRect();
        const pixelDistance = Math.hypot(
          (point.x - lastDragPoint.x) * bounds.width,
          (point.y - lastDragPoint.y) * bounds.height,
        );

        if (pixelDistance > 3) {
          const elapsed = Math.max(12, now - lastDragAt);
          const velocityX = ((point.x - lastDragPoint.x) * 1000) / elapsed;
          const velocityY = ((point.y - lastDragPoint.y) * 1000) / elapsed;
          const speed = Math.hypot(velocityX, velocityY);
          const velocityScale = speed > 1.8 ? 1.8 / speed : 1;
          drag.velocity.x = velocityX * velocityScale;
          drag.velocity.y = velocityY * velocityScale;
          drag.point = point;
          drag.strength = Math.min(
            1,
            drag.strength + 0.1 + Math.min(speed, 1.5) * 0.06,
          );
          paintDrag(
            markContext,
            lastDragPoint,
            point,
            impactSequence + now * 0.001,
          );
          lastDragPoint = point;
          lastDragAt = now;
          lastMarkAt = now;
          dragMoved = true;
        }
      }

      requestRender();
    };

    const pressPointer = (event: PointerEvent) => {
      const point = positionFromEvent(event);
      activePointerId = event.pointerId;
      dragMoved = false;
      dragStartedAt = performance.now();
      lastDragAt = dragStartedAt;
      lastDragPoint = point;
      drag.point = point;
      canvas.setPointerCapture(event.pointerId);
      requestRender();
    };

    const releasePointer = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      if (!dragMoved && performance.now() - dragStartedAt < 500) {
        addWave(positionFromEvent(event));
      }

      activePointerId = null;
      lastDragPoint = null;
      requestRender();
    };

    const updateMarkMap = (now: number) => {
      const delta = Math.min(64, Math.max(0, now - lastMapUpdate));
      const frameScale = delta / (1000 / 60);
      lastMapUpdate = now;

      flowContext.clearRect(0, 0, MARK_SIZE, MARK_SIZE);
      flowContext.drawImage(markCanvas, 0, 0);
      markContext.clearRect(0, 0, MARK_SIZE, MARK_SIZE);
      const driftX =
        (Math.sin(now * 0.00013) * 0.058 +
          Math.sin(now * 0.000047 + 1.4) * 0.026) *
        frameScale;
      const driftY =
        (Math.cos(now * 0.000081 + 0.6) * 0.021 +
          Math.sin(now * 0.000029) * 0.009) *
        frameScale;

      markContext.save();
      markContext.globalAlpha = Math.exp(-delta / 56000);
      markContext.filter = `blur(${Math.min(0.42, 0.18 + frameScale * 0.04)}px)`;
      markContext.drawImage(flowCanvas, driftX, driftY);
      markContext.restore();
      markContext.save();
      markContext.globalCompositeOperation = 'destination-out';
      markContext.globalAlpha = 1 - Math.exp(-delta / 30000);
      markContext.translate(-((now * 0.0027) % 64), -((now * 0.0019) % 64));
      markContext.fillStyle = erosionPattern;
      markContext.fillRect(0, 0, MARK_SIZE + 64, MARK_SIZE + 64);
      markContext.restore();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, markTexture);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        markCanvas,
      );
    };

    const render = (now: number) => {
      animationFrame = 0;
      if (document.hidden) return;

      const elapsed = (now - startedAt) / 1000;
      const idleFor = (now - lastInputAt) / 1000;

      if (!reduceMotion.matches && idleFor > 1.5) {
        const blend = Math.min(1, (idleFor - 1.5) / 4);
        const idleX =
          0.5 +
          Math.sin(elapsed * 0.13) * 0.27 +
          Math.sin(elapsed * 0.037) * 0.05;
        const idleY = 0.51 + Math.cos(elapsed * 0.09 + 0.8) * 0.22;
        target.x += (idleX - target.x) * blend * 0.012;
        target.y += (idleY - target.y) * blend * 0.012;
      }

      pointer.x += (target.x - pointer.x) * 0.045;
      pointer.y += (target.y - pointer.y) * 0.045;

      if (activePointerId === null) {
        const dragDecay = Math.pow(
          0.86,
          Math.min(3, (now - lastDragAt) / 16.67),
        );
        drag.strength *= dragDecay;
        drag.velocity.x *= dragDecay;
        drag.velocity.y *= dragDecay;
      }

      updateMarkMap(now);

      let waveIsActive = false;
      waves.forEach((wave, index) => {
        const offset = index * 4;
        const age = Math.max(0, (now - wave.startedAt) / 1000);
        waveData[offset] = wave.x;
        waveData[offset + 1] = wave.y;
        waveData[offset + 2] = age;
        waveData[offset + 3] = wave.seed;
        waveIsActive ||= age < WAVE_DURATION;
      });

      gl.uniform2f(locations.resolution, canvas.width, canvas.height);
      gl.uniform2f(locations.pointer, pointer.x, pointer.y);
      gl.uniform4f(
        locations.drag,
        drag.point.x,
        drag.point.y,
        drag.velocity.x,
        drag.velocity.y,
      );
      gl.uniform1f(locations.dragStrength, drag.strength);
      gl.uniform4fv(locations.waves, waveData);
      gl.uniform1f(locations.time, reduceMotion.matches ? 0 : elapsed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      const pointerIsMoving =
        Math.abs(target.x - pointer.x) > 0.0001 ||
        Math.abs(target.y - pointer.y) > 0.0001;
      const memoryIsActive = now - lastMarkAt < 45000;

      if (
        !reduceMotion.matches ||
        pointerIsMoving ||
        waveIsActive ||
        memoryIsActive ||
        drag.strength > 0.001
      ) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const requestRender = () => {
      if (animationFrame === 0 && !document.hidden) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) requestRender();
    };

    const handleConsoleTide = () => {
      const sequence = summonedTides + 1;
      const point = {
        x: 0.12 + hash(sequence * 29.17) * 0.76,
        y: 0.16 + hash(sequence * 73.91) * 0.34,
      };

      summonedTides = sequence;
      addWave(point);
      requestRender();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      requestRender();
    });

    window.addEventListener('pointermove', movePointer, { passive: true });
    canvas.addEventListener('pointerdown', pressPointer, { passive: true });
    canvas.addEventListener('pointerup', releasePointer);
    canvas.addEventListener('pointercancel', releasePointer);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('luke:tide', handleConsoleTide);
    reduceMotion.addEventListener('change', requestRender);
    resizeObserver.observe(canvas);
    resize();
    requestRender();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', movePointer);
      canvas.removeEventListener('pointerdown', pressPointer);
      canvas.removeEventListener('pointerup', releasePointer);
      canvas.removeEventListener('pointercancel', releasePointer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('luke:tide', handleConsoleTide);
      reduceMotion.removeEventListener('change', requestRender);
      resizeObserver.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteTexture(markTexture);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="atmospheric-field" aria-hidden="true" />
  );
}
