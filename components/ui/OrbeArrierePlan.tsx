"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.0,1.0);}`;

const FRAGMENT_SHADER = `
precision highp float;
uniform float iTime; uniform vec2 iResolution; uniform vec3 uBg;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float variation(vec2 v1,vec2 v2,float st,float sp){return sin(dot(normalize(v1),normalize(v2))*st+iTime*sp)/100.0;}
float ring(vec2 uv,vec2 c,float rad,float w){vec2 d=c-uv;float l=length(d);l+=variation(d,vec2(0.,1.),5.,2.);l-=variation(d,vec2(1.,0.),5.,2.);return smoothstep(rad-w,rad,l)-smoothstep(rad,rad+w,l);}
void main(){
  vec2 uv=gl_FragCoord.xy/iResolution.xy; uv.x*=iResolution.x/iResolution.y; uv.x-=(iResolution.x/iResolution.y-1.0)*0.5;
  float mask=0.0; float rad=.32; vec2 ctr=vec2(.5);
  mask+=ring(uv,ctr,rad,.045);
  mask+=ring(uv,ctr,rad-.02,.012);
  mask+=ring(uv,ctr,rad+.02,.006);
  vec2 v=rot(iTime*0.35)*(uv-.5);
  float t=0.5+0.5*sin(v.x*4.0+v.y*4.0+iTime*0.4);
  vec3 c1=vec3(0.486,0.227,0.929);
  vec3 c2=vec3(0.925,0.282,0.6);
  vec3 c3=vec3(0.659,0.333,0.969);
  vec3 fg=mix(mix(c1,c2,t),c3,0.5+0.5*sin(iTime*0.3));
  fg=mix(fg,vec3(1.0),0.32);
  vec3 col=mix(uBg,fg,clamp(mask,0.0,1.0)*0.82);
  col=mix(col,vec3(1.),ring(uv,ctr,rad,.003));
  gl_FragColor=vec4(col,1.);
}`;

export function OrbeArrierePlan() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const conteneur = canvas?.parentElement;
    if (!canvas || !conteneur) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const reduitMouvement = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function creerShader(type: number, source: string): WebGLShader | null {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      return shader;
    }

    const programme = gl.createProgram();
    if (!programme) return;
    const vs = creerShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = creerShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;
    gl.attachShader(programme, vs);
    gl.attachShader(programme, fs);
    gl.linkProgram(programme);
    gl.useProgram(programme);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPosition = gl.getAttribLocation(programme, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(programme, "iTime");
    const uResolution = gl.getUniformLocation(programme, "iResolution");
    const uBg = gl.getUniformLocation(programme, "uBg");
    gl.uniform3fv(uBg, new Float32Array([0.961, 0.949, 0.988]));

    function redimensionner() {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const largeur = conteneur!.clientWidth;
      const hauteur = conteneur!.clientHeight;
      canvas!.width = largeur * dpr;
      canvas!.height = hauteur * dpr;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }
    redimensionner();
    window.addEventListener("resize", redimensionner);

    let raf = 0;
    function dessiner(time: number) {
      gl!.uniform1f(uTime, time * 0.001);
      gl!.uniform2f(uResolution, canvas!.width, canvas!.height);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
      if (!reduitMouvement) raf = requestAnimationFrame(dessiner);
    }
    raf = requestAnimationFrame(dessiner);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", redimensionner);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />;
}
