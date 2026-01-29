
export const VERTEX_SHADER = `
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5; // Map -1..1 to 0..1
  gl_Position = vec4(position, 1.0);
}
`;
