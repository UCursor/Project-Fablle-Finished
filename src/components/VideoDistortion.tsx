import { useEffect, useRef } from 'react';

interface VideoDistortionProps {
  videoSrc: string;
  className?: string;
}

export function VideoDistortion({ videoSrc, className }: VideoDistortionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!canvas || !video || !container) return;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    }) || canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });

    if (!gl) return;

    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Pure fluid displacement distortion without noise or circular ripples
    const fsSource = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVideo;
      uniform vec2 uMouse;
      uniform vec2 uPrevMouse;
      uniform vec2 uVelocity;
      uniform float uAspect;
      uniform float uDistortionStrength;

      void main() {
        vec2 uv = vUv;
        
        // Correct aspect ratio for circular distance
        vec2 p = uv - uMouse;
        p.x *= uAspect;
        float dist = length(p);

        // Gaussian influence around pointer
        float radius = 0.28;
        float influence = exp(-dot(p, p) / (radius * radius * 0.5));

        // Fluid displacement vector along cursor velocity and radial push
        vec2 push = normalize(p + vec2(0.0001)) * 0.04;
        vec2 flow = uVelocity * 0.12 + push;

        vec2 distortedUv = uv - flow * influence * uDistortionStrength;
        distortedUv = clamp(distortedUv, 0.0, 1.0);

        // Flip Y for standard video texture coordinates
        vec4 color = texture2D(uVideo, vec2(distortedUv.x, 1.0 - distortedUv.y));
        gl_FragColor = color;
      }
    `;

    function createShader(type: number, source: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      return shader;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uVideo = gl.getUniformLocation(program, 'uVideo');
    const uMouse = gl.getUniformLocation(program, 'uMouse');
    const uPrevMouse = gl.getUniformLocation(program, 'uPrevMouse');
    const uVelocity = gl.getUniformLocation(program, 'uVelocity');
    const uAspect = gl.getUniformLocation(program, 'uAspect');
    const uDistortionStrength = gl.getUniformLocation(program, 'uDistortionStrength');

    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let prevMouseX = 0.5;
    let prevMouseY = 0.5;
    let velX = 0;
    let velY = 0;
    let strength = 0;

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;
      if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      if (
        clientX < rect.left - 100 ||
        clientX > rect.right + 100 ||
        clientY < rect.top - 100 ||
        clientY > rect.bottom + 100
      ) {
        return;
      }

      const x = (clientX - rect.left) / rect.width;
      const y = 1.0 - (clientY - rect.top) / rect.height;
      targetMouseX = Math.max(0, Math.min(1, x));
      targetMouseY = Math.max(0, Math.min(1, y));
      strength = 1.0;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(container!.clientWidth * dpr);
      const h = Math.round(container!.clientHeight * dpr);
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
        gl!.viewport(0, 0, w, h);
      }
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let animId: number;

    function render() {
      prevMouseX = mouseX;
      prevMouseY = mouseY;

      mouseX += (targetMouseX - mouseX) * 0.12;
      mouseY += (targetMouseY - mouseY) * 0.12;

      const rawVelX = (mouseX - prevMouseX) * 10.0;
      const rawVelY = (mouseY - prevMouseY) * 10.0;

      velX += (rawVelX - velX) * 0.1;
      velY += (rawVelY - velY) * 0.1;

      strength *= 0.96;
      const currentStrength = Math.min(2.5, Math.max(0.2, (Math.abs(velX) + Math.abs(velY)) * 2.0 + strength));

      if (video!.readyState >= 2) {
        gl!.bindTexture(gl!.TEXTURE_2D, texture);
        gl!.texImage2D(
          gl!.TEXTURE_2D,
          0,
          gl!.RGBA,
          gl!.RGBA,
          gl!.UNSIGNED_BYTE,
          video!,
        );
      }

      gl!.useProgram(program);
      gl!.uniform1i(uVideo, 0);
      gl!.uniform2f(uMouse, mouseX, mouseY);
      gl!.uniform2f(uPrevMouse, prevMouseX, prevMouseY);
      gl!.uniform2f(uVelocity, velX, velY);
      gl!.uniform1f(uAspect, canvas!.width / Math.max(canvas!.height, 1));
      gl!.uniform1f(uDistortionStrength, currentStrength);

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className || ''}`}>
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        crossOrigin="anonymous"
        className="hidden"
      />
      <canvas ref={canvasRef} className="block w-full h-full object-cover" />
    </div>
  );
}

export default VideoDistortion;
