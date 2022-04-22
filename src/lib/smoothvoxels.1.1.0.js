/**************************************\
*          Smooth Voxels               *
* Copyright (c) 2021 Samuel Van Egmond *
*           MIT License                *
*    https://smoothvoxels.glitch.me    *
\**************************************/

/* global AFRAME */
/* global THREE */

"use strict";

// =====================================================
// /smoothvoxels/svox/svox.js
// =====================================================

var SVOX = {
  clampColors: false,
  models : {}
};

// Material type constants
SVOX.MATSTANDARD = "standard";
SVOX.MATBASIC    = "basic";
SVOX.MATLAMBERT  = "lambert";
SVOX.MATPHONG    = "phong";
SVOX.MATMATCAP   = "matcap";
SVOX.MATTOON     = "toon";
SVOX.MATNORMAL   = "normal";

// Material lighting constants
SVOX.FLAT   = "flat";   // Flat shadeed triangles
SVOX.SMOOTH = "smooth"; // Smooth shaded triangles
SVOX.BOTH   = "both";   // Smooth shaded, but flat shaded clamped / flattened

// Material side constants
SVOX.FRONT  = "front";  // Show only front side of the material
SVOX.BACK   = "back";   // Show only back side of the material
SVOX.DOUBLE = "double"; // Show both sides of the material

SVOX._FACES   = [ 'nx', 'px', 'ny', 'py', 'nz', 'pz'];

// Vertex numbering per side. 
// The shared vertices for side nx (negative x) and pz (positive z) indicated as example:
//
//           --------
//           |1    2|
//           |  py  |
//           |0    3|
//    -----------------------------
//    |1   [2|1]   2|1    2|1    2|    nx shares vertext 2 & 3 
//    |  nx  |  pz  |  px  |  nz  |
//    |0   [3|0]   3|0    3|0    3|    with vertex 1 & 0 of pz
//    -----------------------------
//           |1    2|
//           |  ny  |
//           |0    3|
//           --------

// Define the vertex offsets for each side.

SVOX._VERTICES = {
  nx: [ { x:0, y:0, z:0 },  
        { x:0, y:1, z:0 },  
        { x:0, y:1, z:1 },  
        { x:0, y:0, z:1 }  
      ],
  px: [ { x:1, y:0, z:1 },  
        { x:1, y:1, z:1 },  
        { x:1, y:1, z:0 },  
        { x:1, y:0, z:0 }  
      ],
  ny: [ { x:0, y:0, z:0 },  
        { x:0, y:0, z:1 },  
        { x:1, y:0, z:1 },  
        { x:1, y:0, z:0 }  
      ],
  py: [ { x:0, y:1, z:1 },  
        { x:0, y:1, z:0 },  
        { x:1, y:1, z:0 },  
        { x:1, y:1, z:1 }  
      ],
  nz: [ { x:1, y:0, z:0 },  
        { x:1, y:1, z:0 },  
        { x:0, y:1, z:0 },  
        { x:0, y:0, z:0 }  
      ],
  pz: [ { x:0, y:0, z:1 },  
        { x:0, y:1, z:1 },  
        { x:1, y:1, z:1 },  
        { x:1, y:0, z:1 }  
      ]
};

// Define the neighbor voxels for each face
SVOX._NEIGHBORS = {
  nx: { x:-1, y:0, z:0 },
  px: { x:+1, y:0, z:0 },
  ny: { x:0, y:-1, z:0 },
  py: { x:0, y:+1, z:0 },
  nz: { x:0, y:0, z:-1 },
  pz: { x:0, y:0, z:+1 }  
};

// Define the uv's for each face
// Textures can be shown on all sides of all voxels (allows scaling and rotating) 
// Or a textures with the layout below can be projected on all model sides (no scaling or rotating allowed) 
// NOTE: To cover a model, ensure that the model fits the voxel matrix, i.e has no empty voxels next to it 
//       (export the model to remove unused space).
//
//    0.0   0.25    0.5    0.75   1.0
// 1.0 -----------------------------
//     |      |o     |      |      |
//     |      |  py  |      |  ny  |
//     |      |      |      |o     |
// 0.5 -----------------------------
//     |      |      |      |      |
//     |  nx  |  pz  |  px  |  nz  |
//     |o     |      |     o|      |
// 0.0 -----------------------------
//
SVOX._FACEUVS = {
  nx: {u:'z', v:'y', order:[0,1,2,3], ud: 1, vd: 1, uo:0.00, vo:0.00 },
  px: {u:'z', v:'y', order:[3,2,1,0], ud:-1, vd: 1, uo:0.75, vo:0.00 },
  ny: {u:'x', v:'z', order:[0,1,2,3], ud: 1, vd: 1, uo:0.75, vo:0.50 },
  py: {u:'x', v:'z', order:[1,0,3,2], ud: 1, vd:-1, uo:0.25, vo:1.00 }, 
  nz: {u:'x', v:'y', order:[3,2,1,0], ud:-1, vd: 1, uo:1.00, vo:0.00 },  
  pz: {u:'x', v:'y', order:[0,1,2,3], ud: 1, vd: 1, uo:0.25, vo:0.00 }  
};

// =====================================================
// /smoothvoxels/svox/matrix.js
// =====================================================

// Single Matrix class adapted from https://github.com/evanw/lightgl.js
// Simplified to only the parts needed

// Represents a 4x4 matrix stored in row-major order that uses Float32Arrays
// when available. Matrix operations can either be done using convenient
// methods that return a new matrix for the result or optimized methods
// that store the result in an existing matrix to avoid generating garbage.

let hasFloat32Array = (typeof Float32Array != 'undefined');

// ### new Matrix()
//
// This constructor creates an identity matrix.
class Matrix {
  
  constructor() {
    let m = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
    this.m = hasFloat32Array ? new Float32Array(m) : m;
  }

  // ### .transformPoint(point)
  //
  // Transforms the vector as a point with a w coordinate of 1. This
  // means translations will have an effect, for example.
  transformPoint(v) {
    let m = this.m;
    let div = m[12] * v.x + m[13] * v.y + m[14] * v.z + m[15];
    let x = ( m[0] * v.x + m[1] * v.y + m[2] * v.z + m[3] ) / div;
    let y = ( m[4] * v.x + m[5] * v.y + m[6] * v.z + m[7] ) / div;
    let z = ( m[8] * v.x + m[9] * v.y + m[10] * v.z + m[11] ) / div;
    v.x = x;
    v.y = y;
    v.z = z;
  }

  // ### .transformVector(vector)
  //
  // Transforms the vector as a vector with a w coordinate of 0. This
  // means translations will have no effect, for example.
  transformVector(v) {
    let m = this.m;
    let x = ( m[0] * v.x + m[1] * v.y + m[2] * v.z );
    let y = ( m[4] * v.x + m[5] * v.y + m[6] * v.z );
    let z = ( m[8] * v.x + m[9] * v.y + m[10] * v.z );
    v.x = x;
    v.y = y;
    v.z = z;
  }

  // ### Matrix.identity([result])
  //
  // Returns an identity matrix. You can optionally pass an existing matrix in
  // `result` to avoid allocating a new matrix. 
  static identity(result) {
    result = result || new Matrix();
    let m = result.m;
    m[0] = m[5] = m[10] = m[15] = 1;
    m[1] = m[2] = m[3] = m[4] = m[6] = m[7] = m[8] = m[9] = m[11] = m[12] = m[13] = m[14] = 0;
    return result;
  }

  // ### Matrix.multiply(left, right[, result])
  //
  // Returns the concatenation of the transforms for `left` and `right`. You can
  // optionally pass an existing matrix in `result` to avoid allocating a new
  // matrix. 
  static multiply(left, right, result) {
    result = result || new Matrix();
    let a = left.m, b = right.m, r = result.m;

    r[0] = a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12];
    r[1] = a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13];
    r[2] = a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14];
    r[3] = a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15];

    r[4] = a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12];
    r[5] = a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13];
    r[6] = a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14];
    r[7] = a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15];

    r[8] = a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12];
    r[9] = a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13];
    r[10] = a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14];
    r[11] = a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15];

    r[12] = a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12];
    r[13] = a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13];
    r[14] = a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14];
    r[15] = a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15];

    return result;
  }

  // ### Matrix.transpose(matrix[, result])
  //
  // Returns `matrix`, exchanging columns for rows. You can optionally pass an
  // existing matrix in `result` to avoid allocating a new matrix.
  static  transpose(matrix, result) {
    result = result || new Matrix();
    let m = matrix.m, r = result.m;
    r[0]  = m[0]; r[1]  = m[4]; r[2]  = m[8];  r[3]  = m[12];
    r[4]  = m[1]; r[5]  = m[5]; r[6]  = m[9];  r[7]  = m[13];
    r[8]  = m[2]; r[9]  = m[6]; r[10] = m[10]; r[11] = m[14];
    r[12] = m[3]; r[13] = m[7]; r[14] = m[11]; r[15] = m[15];
    return result;
  }

  // ### Matrix.inverse(matrix[, result])
  //
  // Returns the matrix that when multiplied with `matrix` results in the
  // identity matrix. You can optionally pass an existing matrix in `result`
  // to avoid allocating a new matrix. This implementation is from the Mesa
  // OpenGL function `__gluInvertMatrixd()` found in `project.c`.
  static inverse(matrix, result) {
    result = result || new Matrix();
    let m = matrix.m, r = result.m;

    r[0]  =  m[5]*m[10]*m[15] - m[5]*m[14]*m[11] - m[6]*m[9]*m[15] + m[6]*m[13]*m[11] + m[7]*m[9]*m[14] - m[7]*m[13]*m[10];
    r[1]  = -m[1]*m[10]*m[15] + m[1]*m[14]*m[11] + m[2]*m[9]*m[15] - m[2]*m[13]*m[11] - m[3]*m[9]*m[14] + m[3]*m[13]*m[10];
    r[2]  =  m[1]*m[6]*m[15]  - m[1]*m[14]*m[7]  - m[2]*m[5]*m[15] + m[2]*m[13]*m[7]  + m[3]*m[5]*m[14] - m[3]*m[13]*m[6];
    r[3]  = -m[1]*m[6]*m[11]  + m[1]*m[10]*m[7]  + m[2]*m[5]*m[11] - m[2]*m[9]*m[7]  - m[3]*m[5]*m[10]  + m[3]*m[9]*m[6];

    r[4]  = -m[4]*m[10]*m[15] + m[4]*m[14]*m[11] + m[6]*m[8]*m[15] - m[6]*m[12]*m[11] - m[7]*m[8]*m[14] + m[7]*m[12]*m[10];
    r[5]  =  m[0]*m[10]*m[15] - m[0]*m[14]*m[11] - m[2]*m[8]*m[15] + m[2]*m[12]*m[11] + m[3]*m[8]*m[14] - m[3]*m[12]*m[10];
    r[6]  = -m[0]*m[6]*m[15]  + m[0]*m[14]*m[7]  + m[2]*m[4]*m[15] - m[2]*m[12]*m[7]  - m[3]*m[4]*m[14] + m[3]*m[12]*m[6];
    r[7]  =  m[0]*m[6]*m[11]  - m[0]*m[10]*m[7]  - m[2]*m[4]*m[11] + m[2]*m[8]*m[7]   + m[3]*m[4]*m[10] - m[3]*m[8]*m[6];

    r[8]  =  m[4]*m[9]*m[15]  - m[4]*m[13]*m[11] - m[5]*m[8]*m[15] + m[5]*m[12]*m[11] + m[7]*m[8]*m[13] - m[7]*m[12]*m[9];
    r[9]  = -m[0]*m[9]*m[15]  + m[0]*m[13]*m[11] + m[1]*m[8]*m[15] - m[1]*m[12]*m[11] - m[3]*m[8]*m[13] + m[3]*m[12]*m[9];
    r[10] =  m[0]*m[5]*m[15]  - m[0]*m[13]*m[7]  - m[1]*m[4]*m[15] + m[1]*m[12]*m[7]  + m[3]*m[4]*m[13] - m[3]*m[12]*m[5];
    r[11] = -m[0]*m[5]*m[11]  + m[0]*m[9]*m[7]   + m[1]*m[4]*m[11] - m[1]*m[8]*m[7]   - m[3]*m[4]*m[9]  + m[3]*m[8]*m[5];

    r[12] = -m[4]*m[9]*m[14]  + m[4]*m[13]*m[10] + m[5]*m[8]*m[14] - m[5]*m[12]*m[10] - m[6]*m[8]*m[13] + m[6]*m[12]*m[9];
    r[13] =  m[0]*m[9]*m[14]  - m[0]*m[13]*m[10] - m[1]*m[8]*m[14] + m[1]*m[12]*m[10] + m[2]*m[8]*m[13] - m[2]*m[12]*m[9];
    r[14] = -m[0]*m[5]*m[14]  + m[0]*m[13]*m[6]  + m[1]*m[4]*m[14] - m[1]*m[12]*m[6]  - m[2]*m[4]*m[13] + m[2]*m[12]*m[5];
    r[15] =  m[0]*m[5]*m[10]  - m[0]*m[9]*m[6]   - m[1]*m[4]*m[10] + m[1]*m[8]*m[6]   + m[2]*m[4]*m[9]  - m[2]*m[8]*m[5];

    let det = m[0]*r[0] + m[1]*r[4] + m[2]*r[8] + m[3]*r[12];
    for (let i = 0; i < 16; i++) r[i] /= det;
    return result;
  }

  // ### Matrix.scale(x, y, z[, result])
  //
  // Create a scaling matrix. You can optionally pass an
  // existing matrix in `result` to avoid allocating a new matrix.
  static scale(x, y, z, result) {
    result = result || new Matrix();
    let m = result.m;

    m[0] = x;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;

    m[4] = 0;
    m[5] = y;
    m[6] = 0;
    m[7] = 0;

    m[8] = 0;
    m[9] = 0;
    m[10] = z;
    m[11] = 0;

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  }

  // ### Matrix.translate(x, y, z[, result])
  //
  // Create a translation matrix. You can optionally pass
  // an existing matrix in `result` to avoid allocating a new matrix.
  static translate(x, y, z, result) {
    result = result || new Matrix();
    let m = result.m;

    m[0] = 1;
    m[1] = 0;
    m[2] = 0;
    m[3] = x;

    m[4] = 0;
    m[5] = 1;
    m[6] = 0;
    m[7] = y;

    m[8] = 0;
    m[9] = 0;
    m[10] = 1;
    m[11] = z;

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  }

  // ### Matrix.rotate(a, x, y, z[, result])
  //
  // Create a rotation matrix that rotates by `a` degrees around the vector `x, y, z`.
  // You can optionally pass an existing matrix in `result` to avoid allocating
  // a new matrix. This emulates the OpenGL function `glRotate()`.
  static rotate(a, x, y, z, result) {
    if (!a || (!x && !y && !z)) {
      return Matrix.identity(result);
    }

    result = result || new Matrix();
    let m = result.m;

    let d = Math.sqrt(x*x + y*y + z*z);
    a *= Math.PI / 180; x /= d; y /= d; z /= d;
    let c = Math.cos(a), s = Math.sin(a), t = 1 - c;

    m[0] = x * x * t + c;
    m[1] = x * y * t - z * s;
    m[2] = x * z * t + y * s;
    m[3] = 0;

    m[4] = y * x * t + z * s;
    m[5] = y * y * t + c;
    m[6] = y * z * t - x * s;
    m[7] = 0;

    m[8] = z * x * t - y * s;
    m[9] = z * y * t + x * s;
    m[10] = z * z * t + c;
    m[11] = 0;

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  }

  // ### Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz[, result])
  //
  // Returns a matrix that puts the camera at the eye point `ex, ey, ez` looking
  // toward the center point `cx, cy, cz` with an up direction of `ux, uy, uz`.
  // You can optionally pass an existing matrix in `result` to avoid allocating
  // a new matrix. This emulates the OpenGL function `gluLookAt()`.
  static lookAtORIGINAL(ex, ey, ez, cx, cy, cz, ux, uy, uz, result) {
    result = result || new Matrix();
    let m = result.m;

    // f = e.subtract(c).unit()
    let fx = ex-cx, fy = ey-cy, fz = ez-cz;
    let d = Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx /= d; fy /= d; fz /= d;
    
    // s = u.cross(f).unit()
    let sx = uy * fz - uz * fy;
    let sy = uz * fx - ux * fz;
    let sz = ux * fy - uy * fx;
    d = Math.sqrt(sx*sx + sy*sy + sz*sz);
    sx /= d; sy /= d; sz /= d;
    
    // t = f.cross(s).unit()
    let tx = fy * sz - fz * sy;
    let ty = fz * sx - fx * sz;
    let tz = fx * sy - fy * sx;
    d = Math.sqrt(tx*tx + ty*ty + tz*tz);
    tx /= d; ty /= d; tz /= d;

    m[0] = sx;
    m[1] = sy;
    m[2] = sz;
    m[3] = -(sx*ex + sy*ey + sz*ez);  // -s.dot(e)

    m[4] = tx;
    m[5] = ty;
    m[6] = tz;
    m[7] = -(tx*ex + ty*ey + tz*ez);  // -t.dot(e)

    m[8] = fx;
    m[9] = fy;
    m[10] = fz;
    m[11] = -(fx*ex + fy*ey + fz*ez);  // -f.dot(e)

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  };
  
// ### Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz[, result])
  //
  // Returns a matrix that puts the camera at the eye point `ex, ey, ez` looking
  // toward the center point `cx, cy, cz` with an up direction of `ux, uy, uz`.
  // You can optionally pass an existing matrix in `result` to avoid allocating
  // a new matrix. This emulates the OpenGL function `gluLookAt()`.
  static lookAtTRYOUT(nx, ny, nz, result) {
    result = result || new Matrix();
    let m = result.m;
   
    let len = Math.sqrt(nx*nx + nz*nz);
    
    m[0] =  nz / len;
    m[1] =  0;
    m[2] = -nx / len;
    m[3] =  0;  

    m[4] =  nx*ny / len;
    m[5] = -len;
    m[6] =  nz*ny / len;
    m[7] =  0;

    m[8]  = nx;
    m[9]  = ny;
    m[10] = nz;
    m[11] = 0; 

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  };
  
  static lookAt(nx, ny, nz, result) {
    result = result || new Matrix();
    let m = result.m;
   
    let len = Math.sqrt(nx*nx + nz*nz);
    
    /* Find cosθ and sinθ; if gimbal lock, choose (1,0) arbitrarily */
    let c2 = len ? nx / len : 1.0;
    let s2 = len ? nz / len : 0.0;

    m[0] = nx;
    m[1] = -s2;
    m[2] = -nz*c2;
    m[3] = 0;
    
    m[4] = ny;
    m[5] = 0;
    m[6] = len;
    m[7] = 0;
    
    m[8] = nz;
    m[9] = c2;
    m[10] = -nz*s2;
    m[11] = 0;
    
    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  };
  
   rotation_matrix(v)
  {
  }
}

// =====================================================
// /smoothvoxels/svox/planar.js
// =====================================================

/**
 * Planars are the representaions of origin, clamp and skip
 */
class Planar {

    /**
     * Parse a planar representation from a string.
     * @param {string} value The string containing the planar settings.
     * @returns {object} An object with the planar values.
     */
    static parse(value) {
    value = ' ' + (value || '').toLowerCase();
      
    if (value !== ' ' && !/^(?!$)(\s+(?:none|-x|x|\+x|-y|y|\+y|-z|z|\+z|\s))+\s*$/.test(value)) {
      throw {
        name: 'SyntaxError',
        message: `Planar expression '${value}' is only allowed to be 'none' or contain -x x +x -y y +y -z z +z.`
      };  
    }
      
    return {
      nx: value.includes('-x'),
       x: value.includes(' x'),
      px: value.includes('+x'),
      ny: value.includes('-y'),
       y: value.includes(' y'),
      py: value.includes('+y'),
      nz: value.includes('-z'),
       z: value.includes(' z'),
      pz: value.includes('+z')
    };
  }
  
  /**
   * Returns a planar as a string.
   * @param {object} planar The planar object.
   * @returns {string} The planar string.
   */ 
  static toString(planar) {
    let result = '' 
               + (planar.nx ? ' -x' : '') + (planar.x ? ' x' : '') + (planar.px ? ' +x' : '')
               + (planar.ny ? ' -y' : '') + (planar.y ? ' y' : '') + (planar.py ? ' +y' : '')
               + (planar.nz ? ' -z' : '') + (planar.z ? ' z' : '') + (planar.pz ? ' +z' : '');
    return result.trim();
  }  
  
  /**
   * Combines two planars.
   * @param {object} planar1 The first planar object.
   * @param {object} planar2 The first planar object.
   * @param {object} defaultPlanar The default returned when planar1 and planar2 are both not set.
   * @returns {object} An object with the combined planar values.
   */ 
  static combine(planar1, planar2, defaultPlanar) {
    if (!planar1 && !planar2)
      return defaultPlanar;
    if (!planar1)
      return planar2;
    if (!planar2)
      return planar1;
    if (planar1 === planar2)
      return planar1;
    return {
      nx: planar1.nx || planar2.nx,
       x: planar1.x  || planar2.x,
      px: planar1.px || planar2.px,
      ny: planar1.ny || planar2.ny,
       y: planar1.y  || planar2.y,
      py: planar1.py || planar2.py,
      nz: planar1.nz || planar2.nz,
       z: planar1.z  || planar2.z,
      pz: planar1.pz || planar2.pz
    };
  }

}

// =====================================================
// /smoothvoxels/svox/boundingbox.js
// =====================================================

class BoundingBox {

  get size() { 
    if (this.minX > this.maxX)
      return { x:0, y:0, z:0};
    else
      return {
        x: this.maxX - this.minX + 1,
        y: this.maxY - this.minY + 1,
        z: this.maxZ - this.minZ + 1
      };
  }
  
  contructor() {
    this.reset();
  }
  
  reset() {
    this.minX = Number.POSITIVE_INFINITY;
    this.minY = Number.POSITIVE_INFINITY;
    this.minZ = Number.POSITIVE_INFINITY;
    this.maxX = Number.NEGATIVE_INFINITY;
    this.maxY = Number.NEGATIVE_INFINITY;
    this.maxZ = Number.NEGATIVE_INFINITY;
  }

  set(x, y, z) {
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);
    this.minZ = Math.min(this.minZ, z);
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
    this.maxZ = Math.max(this.maxZ, z);
  }
        
  // End of class BoundingBox
}

// =====================================================
// /smoothvoxels/svox/voxelmatrix.js
// =====================================================

// =====================================================
// class Voxel
// =====================================================

/* Note, voxels only supports hexadecimal colors like #FFF or #FFFFFF*/
class Voxel {
  
  constructor(color) {
    this.color = color;
    this.material = color.material;
    this.faces = { };
    this.visible = true;
  }
  
  dispose() {
    this.color = null;
    this.material = null;
    this.faces = null;
  }
}

// =====================================================
// class VoxelMatrix
// =====================================================

class VoxelMatrix {
  
  get minX()  { return this.bounds.minX; }
  get minY()  { return this.bounds.minY; }
  get minZ()  { return this.bounds.minZ; }
  get maxX()  { return this.bounds.maxX; }
  get maxY()  { return this.bounds.maxY; }
  get maxZ()  { return this.bounds.maxZ; }
  
  get size() { 
    if (this.minX > this.maxX)
      return { x:0, y:0, z:0};
    else
      return {
        x: this.maxX - this.minX + 1,
        y: this.maxY - this.minY + 1,
        z: this.maxZ - this.minZ + 1
      };
  }
 
  get count() { return this._count; }
  
  constructor() {
    this.bounds = new BoundingBox();
    this._voxels = [];
    this._count = 0;
    this.prepareForWrite();
  }
  
  reset() {
    this.forEach(function(voxel) {
      voxel.reset;
    }, this, true);
    this.bounds.reset();
    this._voxels = [];
    this._count = 0;
  }
  
  setVoxel(x, y, z, voxel) {
    if (!(voxel instanceof Voxel))
     throw new Error("setVoxel requires a Voxel set to an existing color of a material of this model.");
     
    this.bounds.set(x, y, z);
    voxel.material.bounds.set(x, y, z);

    voxel.x = x;
    voxel.y = y;
    voxel.z = z;
    
    let matrixy = this._voxels[z + 1000000];
    if (!matrixy) { 
      matrixy = [ ];
      this._voxels[z + 1000000] = matrixy;
    }
    let matrixx = matrixy[y + 1000000];
    if (!matrixx) {
      matrixx = [ ];
      matrixy[y + 1000000] = matrixx;
    }
    
    if (!matrixx[x + 1000000])
      this._count++;
  
    matrixx[x + 1000000] = voxel;
  }
  
  clearVoxel(x, y, z) {
    let matrix = this._voxels[z + 1000000];
    if (matrix) {
      matrix = matrix[y + 1000000];
      if (matrix) {
        let voxel = matrix[x + 1000000];
        if (voxel) {
          voxel.color--;   
          this._count++;
          matrix.splice(x,1);
        }
      }
    }
  }
  
  getVoxel(x, y, z) {
    let matrix = this._voxels[z + 1000000];
    if (matrix) {
      matrix = matrix[y + 1000000];
      if (matrix) {
        return matrix[x + 1000000];
      }
    }
    return null;
  }
      
  forEach(func, thisArg, visibleOnly) {
    for (let indexz in this._voxels) {
      let matrixy = this._voxels[indexz];
      for (let indexy in matrixy) {
        let matrixx = matrixy[indexy];
        for (let indexx in matrixx) {
          let voxel = matrixx[indexx];
          if (voxel && (!visibleOnly || voxel.visible)) {
            let stop = func.apply(thisArg, [voxel] );
            if (stop === true) return;
          }
        }
      }
    }
  }
  
  forEachInBoundary(func, thisArg) {
    for (let z = this.bounds.minZ; z <= this.bounds.maxZ; z++) {
      for (let y = this.bounds.minY; y <= this.bounds.maxY; y++) {
        for (let x = this.bounds.minX; x <= this.bounds.maxX; x++) {
          let stop = func.apply(thisArg, [this.getVoxel(x,y,z)] );
          if (stop === true) return;
        }
      }
    }
  }
    
  prepareForWrite() {
    this.bounds.reset();
    this._count = 0;
    
    this.forEach(function overwriteVoxel(voxel) {
      // Overrwite all voxels to recalulate the bounding box, count the voxels and counts the colors
      this.setVoxel(voxel.x, voxel.y, voxel.z, voxel);
    }, this);  
  }
    
  /*
  _determineOriginOffset() { 
    let xOffset = -(this.bounds.minX + this.bounds.maxX)/2;
    let yOffset = -(this.bounds.minY + this.bounds.maxY)/2;
    let zOffset = -(this.bounds.minZ + this.bounds.maxZ)/2;
    
    if (this._origin.nx) xOffset = -(this.bounds.minX - 0.5);
    if (this._origin.px) xOffset = -(this.bounds.maxX + 0.5);
    if (this._origin.ny) yOffset = -(this.bounds.minY - 0.5);
    if (this._origin.py) yOffset = -(this.bounds.maxY + 0.5);
    if (this._origin.nz) zOffset = -(this.bounds.minZ - 0.5);
    if (this._origin.pz) zOffset = -(this.bounds.maxZ + 0.5);

    this._originOffset = { x: xOffset, y:yOffset, z:zOffset };
  }
  */
  
  // End of class VoxelMatrix
}

// =====================================================
// /smoothvoxels/svox/materiallist.js
// =====================================================

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

// =====================================================
// class Color
// =====================================================

/* Note, the Color class only supports hexadecimal colors like #FFF or #FFFFFF. */
/*       Its r, g and b members are stored as floats between 0 and 1.           */

class Color {

  static fromHex(hex) {
    let color = new Color();
    color._set(hex);
        
    color.id = '';
    color.exId = null; // Used for MagicaVoxel color index
    color.count = 0;
    
    return color;
  } 
  
  // r, g, b from 0 to 1 !!
  static fromRgb(r, g, b) {
    r = Math.round(clamp(r, 0, 1) * 255);
    g = Math.round(clamp(g, 0, 1) * 255);
    b = Math.round(clamp(b, 0, 1) * 255);
    let color = '#' +
                (r < 16 ? '0' : '') + r.toString(16) +
                (g < 16 ? '0' : '') + g.toString(16) +
                (b < 16 ? '0' : '') + b.toString(16);
    return Color.fromHex(color);
  } 
  
  clone() {
    let clone = new Color();
    clone._color = this._color;
    clone.r = this.r;
    clone.g = this.g;
    clone.b = this.b;
    clone._material = this._material;
    return clone;
  }
  
  multiply(factor) {
    if (factor instanceof Color)
      return Color.fromRgb(this.r*factor.r, this.g*factor.g, this.b*factor.b);
    else
      return Color.fromRgb(this.r*factor, this.g*factor, this.b*factor);
  }
  
  add(...colors) {
    let r = this.r + colors.reduce((sum, color) => sum + color.r, 0);
    let g = this.g + colors.reduce((sum, color) => sum + color.g, 0);
    let b = this.b + colors.reduce((sum, color) => sum + color.b, 0);
    return Color.fromRgb(r, g, b);
  }

  _setMaterial(material) {
    if (this._material !== undefined)
      throw "A Color can only be added once.";

    this._material = material;    
    this.count = 0;
  }
  
  get material() {
    return this._material;
  }
  
  _set(colorValue) {
    let color = colorValue;
    if (typeof color === 'string' || color instanceof String) {
      color = color.trim().toUpperCase();
      if (color.match(/^#([0-9a-fA-F]{3}|#?[0-9a-fA-F]{6})$/)) {
        color = color.replace('#', '');
        
        this._color = '#' + color;
        
        if (color.length === 3) {
          color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2]; 
        }
        
        // Populate .r .g and .b
        let value = parseInt(color, 16);
        this.r = ((value >> 16) & 255) / 255;
        this.g = ((value >> 8) & 255) / 255;
        this.b = (value & 255) / 255;
        
        return;
      }
    }    
    
    throw {
        name: 'SyntaxError',
        message: `Color ${colorValue} is not a hexadecimal color of the form #000 or #000000.`
    };
  }
  
  toString() {
    return this._color;
  }
}

// =====================================================
// class BaseMaterial
// =====================================================

class BaseMaterial {
  
  constructor(type, roughness, metalness, 
              opacity, alphaTest, transparent, wireframe, side,
              emissiveColor, emissiveIntensity, fog,
              map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap,
              uscale, vscale, uoffset, voffset, rotation) {

    type = type || SVOX.MATSTANDARD;
    
    switch (type) {
      case SVOX.MATSTANDARD:
      case SVOX.MATBASIC:
      case SVOX.MATLAMBERT:
      case SVOX.MATPHONG:
      case SVOX.MATTOON:
      case SVOX.MATMATCAP:
      case SVOX.MATNORMAL:
        // Type is ok
        break;
      default: {
        throw {
          name: 'SyntaxError',
          message: `Unknown material type '${type}'.`
        };            
      }
    }
    this.type = type;
    
    if (((map && map.cube) || (normalMap && normalMap.cube) || (roughnessMap && roughnessMap.cube) || (metalnessMap && metalnessMap.cube) || (emissiveMap && emissiveMap.cube)) &&
        !(uscale === -1 && vscale === -1))
      throw {
          name: 'SyntaxError',
          message: `Cube textures can not be combined with maptransform`
      };

    this.index = 0;
    
    // Standard material values
    this.roughness = typeof roughness === 'number' ? roughness : 1;
    this.metalness = typeof metalness === 'number' ? metalness : 0;
    this.opacity   = typeof opacity   === 'number' ? opacity   : 1;
    this.alphaTest = typeof alphaTest === 'number' ? alphaTest : 0;
    this.transparent = transparent ? true : false;
    this.wireframe = wireframe ? true : false;
    this.side = side ? side : 'front';
    if (!['front', 'back', 'double'].includes(this.side))
      this.side = 'front';
    this.setEmissive(emissiveColor, emissiveIntensity);  
    this.fog = typeof fog === 'boolean' ? fog : true;
    
    this.map = map;
    this.normalMap = normalMap;
    this.roughnessMap = roughnessMap;
    this.metalnessMap = metalnessMap;
    this.emissiveMap = emissiveMap;
    this.matcap = matcap;
    this.mapTransform = { uscale:uscale || -1, vscale:vscale || -1, 
                          uoffset:uoffset || 0, voffset:voffset || 0, 
                          rotation:rotation || 0 };
    
    this.aoActive = false;
    
    this._colors = [];
  }
  
  get baseId() {
    return `${this.type}|${this.roughness}|${this.metalness}|` +
           `${this.opacity}|${this.alphaTest}|${this.wireframe?1:0}|${this.side}|`+ 
           (this.emissive ? `${this.emissive.color}|${this.emissive.intensity}|` : `||`) + 
           `${this.fog?1:0}|` +
           (this.map ? `${this.map.id}|` : `|`) + 
           (this.normalMap ? `${this.normalMap.id}|` : `|`) +
           (this.roughnessMap ? `${this.roughnessMap.id}|` : `|`) +
           (this.metalnessMap ? `${this.metalnessMap.id}|` : `|`) +
           (this.emissiveMap  ? `${this.emissiveMap.id}|`  : `|`) +
           (this.matcap ? `${this.matcap.id}|` : `|`) +
           `${this.mapTransform.uscale}|${this.mapTransform.vscale}|` + 
           `${this.mapTransform.uoffset}|${this.mapTransform.voffset}|` +
           `${this.mapTransform.rotation}`;
  }
  
  get isTransparent() {
    return this.transparent || this.opacity < 1.0;
  }
  
  setEmissive(color, intensity) {
    if (color === undefined || color === "#000" || color === "#000000" || !(intensity || 0))
      this._emissive = undefined;
    else
      this._emissive = { color: Color.fromHex(color), intensity: intensity };
  }
  
  get emissive() {
    return this._emissive;
  }
   
  get colors() {
    return this._colors;
  }
  
  get colorCount() {
    return this._colors.length;
  } 
  
  get colorUsageCount() {
    return this._colors.reduce((s,c) => (s + c.count), 0);
  } 
}

// =====================================================
// class Material
// =====================================================

class Material {
  
  constructor(baseMaterial, lighting, fade) {
  
    this._baseMaterial = baseMaterial;
    
    // lighting, smooth, flat or both
    this.lighting = lighting;
    this.fade = fade ? true : false;
    
    // Preset the shape modifiers
    this._deform = undefined;
    this._warp = undefined;
    this._scatter = undefined;
    
    this._flatten = Planar.parse('');
    this._clamp = Planar.parse('');
    this._skip = Planar.parse('');    
    
    this._ao = undefined;
    this.lights = true;

    this._colors = [];
    
    this.bounds = new BoundingBox();
  }
    
  get baseId() {
    return this._baseMaterial.baseId;
  }
  
  get index() {
    return this._baseMaterial.index;
  }
  
  get colors() {
    return this._colors;
  }
  
  get colorCount() {
    return this._baseMaterial.colorCount;
  }
  
  get type() {
    return this._baseMaterial.type;
  }

  get roughness() {
    return this._baseMaterial.roughness;
  }
    
  get metalness() {
    return this._baseMaterial.metalness;
  }
    
  get opacity() {
    return this._baseMaterial.opacity;
  }
  
  get alphaTest() {
    return this._baseMaterial.alphaTest;
  }
  
  get transparent() {
    return this._baseMaterial.transparent;
  }

  get isTransparent() {
    return this._baseMaterial.isTransparent;
  }
      
  get emissive() {
    return this._baseMaterial.emissive;
  }
  
  get side() {
    return this._baseMaterial.side;
  }
    
  get fog() {
    // Emissive materials shine through fog (in case fog used as darkness) 
    return this._baseMaterial.fog;
  }
  
  get map() {
    return this._baseMaterial.map;
  }
    
  get normalMap() {
    return this._baseMaterial.normalMap;
  }
  
  get roughnessMap() {
    return this._baseMaterial.roughnessMap;
  }
  
  get metalnessMap() {
    return this._baseMaterial.metalnessMap;
  }
  
  get emissiveMap() {
    return this._baseMaterial.emissiveMap;
  }
  
  get matcap() {
    return this._baseMaterial.matcap;
  }

  get mapTransform() {
    return this._baseMaterial.mapTransform;
  }

  setDeform(count, strength, damping) {
    count = Math.max((count === null || count === undefined) ? 1 : count, 0);
    strength = (strength === null || strength === undefined) ? 1.0 : strength;
    damping = (damping === null || damping === undefined) ? 1.0 : damping;
    if (count > 0 && strength !== 0.0)
      this._deform = { count, strength, damping };
    else
      this._deform = undefined;
  }
  
  get deform() {
    return this._deform;
  }
  
  setWarp(amplitude, frequency) {
    amplitude = amplitude === undefined ? 1.0 : Math.abs(amplitude);
    frequency = frequency === undefined ? 1.0 : Math.abs(frequency);
    if (amplitude > 0.001 && frequency > 0.001)
      this._warp = { amplitude:amplitude, frequency:frequency };
    else
      this._warp = undefined;
  }

  get warp() {
    return this._warp;
  }

  set scatter(value) {
    if (value === 0.0) 
      value = undefined;
    this._scatter = Math.abs(value);
  }

  get scatter() {
    return this._scatter;
  }
  
  // Getters and setters for planar handling
  set flatten(flatten)  { this._flatten = Planar.parse(flatten); }
  get flatten() { return Planar.toString(this._flatten); }
  set clamp(clamp)  { this._clamp = Planar.parse(clamp); }
  get clamp() { return Planar.toString(this._clamp); }
  set skip(skip)  { this._skip = Planar.parse(skip); }
  get skip() { return Planar.toString(this._skip); }
  
  // Set AO as { color, maxDistance, strength, angle }
  setAo(ao) {
     this._ao = ao;
  }  
   
  get ao() {
    return this._ao;
  }
  
  set aoSides(sides)  { this._aoSides = Planar.parse(sides); }
  get aoSides() { return Planar.toString(this._aoSides); }
  
  get colors() {
    return this._colors;
  }
  
  addColorHEX(hex) {
    return this.addColor(Color.fromHex(hex));
  }  

  addColorRGB(r, g, b) {
    return this.addColor(Color.fromRgb(r, g, b));
  }    
  
  addColor(color) {
    if (!(color instanceof Color))
      throw "addColor requires a Color object, e.g. material.addColor(Color.fromHex('#FFFFFF'))";
       
    color._setMaterial(this);
    this._colors.push(color);
    this._baseMaterial._colors.push(color);
    return color;
  }
   
}

// =====================================================
// class MaterialList
// =====================================================

class MaterialList {
  
    constructor() {
      this.baseMaterials = [];
      this.materials = [];
    }
  
    createMaterial(type, lighting, roughness, metalness, 
                   fade, opacity, alphaTest, transparent, wireframe, side,
                   emissiveColor, emissiveIntensity, fog,
                   map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap,
                   uscale, vscale, uoffset, voffset, rotation) {
      
      let baseMaterial = new BaseMaterial(type, roughness, metalness, 
                                          opacity, alphaTest, transparent, wireframe, side,
                                          emissiveColor, emissiveIntensity, fog,
                                          map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap,
                                          uscale, vscale, uoffset, voffset, rotation);
      let baseId = baseMaterial.baseId;
      let existingBase = this.baseMaterials.find(m => m.baseId === baseId);
      
      if (existingBase) {
        baseMaterial = existingBase;
      }
      else {
        this.baseMaterials.push(baseMaterial);
      }
      
      let material = new Material(baseMaterial, lighting, fade);
      this.materials.push(material);
      
      return material;
    }
  
    forEach(func, thisArg, baseOnly) {
      if (baseOnly) {
        this.baseMaterials.foreach(func, thisArg);
      }
      else {
        this.materials.forEach(func, thisArg);
      }
    }
  
    find(func) {
      return this.materials.find(func);
    }
  
    findColorByExId(exId) {
      let color = null;
      this.forEach(function(material) {
        if (!color) 
          color = material.colors.find(c => c.exId === exId);
      }, this);
      
      return color;
    }
  
}

// =====================================================
// /smoothvoxels/svox/noise.js
// =====================================================

// http://mrl.nyu.edu/~perlin/noise/

// This is the Improved Noise from the examples of Three.js.
// It was adapted to change the permutation array from hard coded to generated.

SVOX.Noise = function () {

	let p = [];
  for ( let i = 0; i < 256; i ++ ) {
    p[i] = Math.floor(Math.random()*256);
		p[i + 256] = p[i];
	}

	function fade( t ) {
		return t * t * t * ( t * ( t * 6 - 15 ) + 10 );
	}

	function lerp( t, a, b ) {
		return a + t * ( b - a );
	}

	function grad( hash, x, y, z ) {
		let h = hash & 15;
		let u = h < 8 ? x : y, v = h < 4 ? y : h == 12 || h == 14 ? x : z;
		return ( ( h & 1 ) == 0 ? u : - u ) + ( ( h & 2 ) == 0 ? v : - v );
	}

	return {

		noise: function ( x, y, z ) {

			let floorX = Math.floor( x ), 
          floorY = Math.floor( y ), 
          floorZ = Math.floor( z );

			let X = floorX & 255, 
          Y = floorY & 255, 
          Z = floorZ & 255;

			x -= floorX;
			y -= floorY;
			z -= floorZ;

			let xMinus1 = x - 1, yMinus1 = y - 1, zMinus1 = z - 1;
			let u = fade( x ), v = fade( y ), w = fade( z );
			let  A = p[ X ] + Y, 
          AA = p[ A ] + Z, 
          AB = p[ A + 1 ] + Z, 
           B = p[ X + 1 ] + Y, 
          BA = p[ B ] + Z, 
          BB = p[ B + 1 ] + Z;

			return lerp( w, 
          lerp( v, 
                lerp( u, grad( p[ AA ], x, y, z ),
                         grad( p[ BA ], xMinus1, y, z ) ),
                lerp( u, grad( p[ AB ], x, yMinus1, z ),
                         grad( p[ BB ], xMinus1, yMinus1, z ) ) 
              ),
    			lerp( v, 
               lerp( u, grad( p[ AA + 1 ], x, y, zMinus1 ),
				                grad( p[ BA + 1 ], xMinus1, y, z - 1 ) ),
			         lerp( u, grad( p[ AB + 1 ], x, yMinus1, zMinus1 ),
				                grad( p[ BB + 1 ], xMinus1, yMinus1, zMinus1 ) ) 
              ) 
      );
		}
	};

};

// =====================================================
// /smoothvoxels/svox/deformer.js
// =====================================================

class Deformer {
  
  static changeShape(model, shape) {
    switch (shape) {
      case 'sphere' : Deformer._circularDeform(model, 1, 1, 1); break;
      case 'cylinder-x' : Deformer._circularDeform(model, 0, 1, 1); break;
      case 'cylinder-y' : Deformer._circularDeform(model, 1, 0, 1); break;
      case 'cylinder-z' : Deformer._circularDeform(model, 1, 1, 0); break;
      case 'box': break;
      default: break;
    }
  }

  static _circularDeform(model, xStrength, yStrength, zStrength) {
    let xMid = (model.voxels.minX + model.voxels.maxX)/2 + 0.5;
    let yMid = (model.voxels.minY + model.voxels.maxY)/2 + 0.5;
    let zMid = (model.voxels.minZ + model.voxels.maxZ)/2 + 0.5;    
    model.forEachVertex(function(vertex) {
      let x = (vertex.x - xMid);
      let y = (vertex.y - yMid);
      let z = (vertex.z - zMid);
      let sphereSize = Math.max(
                          Math.abs(x * xStrength), 
                          Math.abs(y * yStrength), 
                          Math.abs(z * zStrength)
                        );
      let vertexDistance = Math.sqrt(x*x*xStrength + y*y*yStrength + z*z*zStrength);
      if (vertexDistance === 0) return;
      let factor = sphereSize / vertexDistance;
      vertex.newPos.x = x*((1-xStrength) + (xStrength)*factor) + xMid;
      vertex.newPos.y = y*((1-yStrength) + (yStrength)*factor) + yMid;
      vertex.newPos.z = z*((1-zStrength) + (zStrength)*factor) + zMid;
      vertex.newPos.set = true;
      vertex.ring = sphereSize;
    }, this);

    Deformer._repositionChangedVertices(model, true);
    
    Deformer._markEquidistantFaces(model);
  }  
  
    
  static _markEquidistantFaces(model) {
    model.voxels.forEach(function(voxel) {      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped)
          continue;

        face.equidistant = true;
        let ring = face.vertices[0].ring;
        
        for (let v = 1; v < 4; v++) {
          let vertex = face.vertices[v];
          if (vertex.ring !== ring) {
            face.equidistant = false;
            break;
          }
        }
      }
    }, this);
  }
  
  
  static maximumDeformCount(model) {
    let maximumCount = 0;
    model.materials.forEach(function(material) {
      if (material.deform)
        maximumCount = Math.max(maximumCount, material.deform.count)
    });
    return maximumCount;
  }
  
  static deform(model, maximumDeformCount) {
    
    for (let step = 0; step < maximumDeformCount; step++) {

      model.forEachVertex(function(vertex) {

        if (vertex.deform && vertex.deform.count > step) {
          let links = vertex.links;

          if (links.length > 0) {
            // Average all connected vertices
            let x=0, y=0, z=0;
            for (let l=0; l < links.length; l++) {
              x += links[l].x;
              y += links[l].y;
              z += links[l].z;
            }
            
            // The offset is the average of the connected vertices
            let offsetX = x/links.length - vertex.x;
            let offsetY = y/links.length - vertex.y; 
            let offsetZ = z/links.length - vertex.z;
            
            let strength = Math.pow(vertex.deform.damping, step) * vertex.deform.strength;
            if (strength !== 0) {
              vertex.newPos.x = vertex.x+offsetX*strength; 
              vertex.newPos.y = vertex.y+offsetY*strength; 
              vertex.newPos.z = vertex.z+offsetZ*strength;
              vertex.newPos.set = true;
            } 
          }
        }
      }, this);

      Deformer._repositionChangedVertices(model);
    }
  }

  static warpAndScatter(model) {
    let noise = SVOX.Noise().noise;
    let voxels = model.voxels;
    let tile = model._tile;
    
    model.forEachVertex(function(vertex) {

      // In case of tiling, do not warp or scatter the edges
      if ((tile.nx && vertex.x < voxels.minX+0.1) || 
          (tile.px && vertex.x > voxels.maxX+0.9) ||
          (tile.ny && vertex.y < voxels.minY+0.1) || 
          (tile.py && vertex.y > voxels.maxY+0.9) ||
          (tile.nz && vertex.z < voxels.minZ+0.1) || 
          (tile.pz && vertex.z > voxels.maxZ+0.9))
        return;
      
      let amplitude = vertex.warp ? vertex.warp.amplitude : 0;
      let frequency = vertex.warp ? vertex.warp.frequency : 0;
      let scatter = vertex.scatter || 0;
      
      if (amplitude || scatter) {
        let xOffset = 0, yOffset = 0, zOffset = 0;

        if (amplitude) {
          xOffset = noise( (vertex.x+0.19) * frequency, vertex.y * frequency, vertex.z * frequency) * amplitude;
          yOffset = noise( (vertex.y+0.17) * frequency, vertex.z * frequency, vertex.x * frequency) * amplitude;
          zOffset = noise( (vertex.z+0.13) * frequency, vertex.x * frequency, vertex.y * frequency) * amplitude;
        }

        if (scatter) {
          xOffset += (Math.random() * 2 - 1) * scatter;
          yOffset += (Math.random() * 2 - 1) * scatter;
          zOffset += (Math.random() * 2 - 1) * scatter;
        }

        vertex.newPos.x = vertex.x + xOffset;
        vertex.newPos.y = vertex.y + yOffset;
        vertex.newPos.z = vertex.z + zOffset;
        vertex.newPos.set = true;
      }
    }, this);

    Deformer._repositionChangedVertices(model);
  }

  static _repositionChangedVertices(model, dontclamp) {
    
    // Add 0.5 to the min and max because vertices of voxel are 0 - +1  
    // I.e voxel (0,0,0) occupies the space (0,0,0) - (1,1,1) 
    let minX = model.voxels.minX + 0.5;
    let maxX = model.voxels.maxX + 0.5;
    let minY = model.voxels.minY + 0.5;
    let maxY = model.voxels.maxY + 0.5;
    let minZ = model.voxels.minZ + 0.5;
    let maxZ = model.voxels.maxZ + 0.5;
    
    if (dontclamp) {
      // Move all vertices to their new position without clamping / flattening
      model.forEachVertex(function(vertex) {
        if (vertex.newPos.set) {
          vertex.x = vertex.newPos.x;
          vertex.y = vertex.newPos.y;
          vertex.z = vertex.newPos.z;
          vertex.newPos.set = false;
        }
      }, this); 
    }
    else {
      // Move all vertices to their new position clamping / flattening as required
      model.forEachVertex(function(vertex) {
        if (vertex.newPos.set) {
          vertex.x = (vertex.flatten.x || vertex.clamp.x) ? vertex.x : vertex.newPos.x;
          vertex.y = (vertex.flatten.y || vertex.clamp.y) ? vertex.y : vertex.newPos.y;
          vertex.z = (vertex.flatten.z || vertex.clamp.z) ? vertex.z : vertex.newPos.z;

          vertex.newPos.set = false;
        }
      }, this); 
    }
  }
  
}

// =====================================================
// /smoothvoxels/svox/verticestransformer.js
// =====================================================

class VerticesTransformer {
         
  static transformVertices(model) {
    let bounds = model._determineBounds();
    
    // Define the transformation in reverse order to how they are carried out
    let vertexTransform = new Matrix(); 

    vertexTransform = Matrix.multiply(vertexTransform, Matrix.translate(model.position.x, model.position.y, model.position.z));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.rotate(model.rotation.z, 0, 0, 1));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.rotate(model.rotation.y, 0, 1, 0));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.rotate(model.rotation.x, 1, 0, 0)); 
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.scale(model.scale.x, model.scale.y, model.scale.z));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.scale(bounds.scale.x, bounds.scale.y, bounds.scale.z));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.translate(bounds.offset.x, bounds.offset.y, bounds.offset.z));    
    
    // Convert the vertex transform matrix in a normal transform matrix 
    let normalTransform = Matrix.inverse(vertexTransform);
    normalTransform = Matrix.transpose(normalTransform);

    // Now move all vertices to their new position and transform the average normals
    model.forEachVertex(function(vertex) {      
      vertexTransform.transformPoint(vertex)
      if (vertex.averageNormal) {
        normalTransform.transformVector(vertex.averageNormal);
        model._normalize(vertex.averageNormal);
      }
    }, this); 
         
    // Transform all normals
    model.voxels.forEach(function transformNormals(voxel) {
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face && !face.skipped) {
          for (let n = 0; n<face.normals.length; n++) {
            if (!face.normals[n].transformed) {
              normalTransform.transformVector(face.normals[n]);
              model._normalize(face.normals[n]);
              face.normals[n].transformed = true;
            }
          }
        }
      }
    }, this);
  }
  
}

// =====================================================
// /smoothvoxels/svox/normalscalculator.js
// =====================================================

class NormalsCalculator {
 
  static calculateNormals(model) {
    let tile = model.tile;
    let voxels = model.voxels;
    
    voxels.forEach(function computeNormals(voxel) {
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped) 
          continue;
        
        let vmid = { 
          x: (face.vertices[0].x + face.vertices[1].x + face.vertices[2].x + face.vertices[3].x) / 4,
          y: (face.vertices[0].y + face.vertices[1].y + face.vertices[2].y + face.vertices[3].y) / 4,
          z: (face.vertices[0].z + face.vertices[1].z + face.vertices[2].z + face.vertices[3].z) / 4
        };
        face.normals = [];

        // Per vertex calculate the normal by means of the cross product
        // using the previous vertex and the quad midpoint.
        // This prevents (most) flipped normals when one vertex moves over the diagonal.
        for (let v = 0; v < 4; v++) {
          let vertex = face.vertices[v];
          let vprev = face.vertices[(v+3) % 4];
          
          if (!vertex.normal) {
            vertex.normal = { x:0, y:0, z:0 };
            vertex.averageNormal = { x:0, y:0, z:0 };
          }
          
          // Subtract vectors
          let e1 = { x: vprev.x - vertex.x, y: vprev.y - vertex.y, z: vprev.z - vertex.z };
          let e2 = { x: vmid.x - vertex.x, y: vmid.y - vertex.y, z: vmid.z - vertex.z };
          
          // Normalize 
          model._normalize(e1);
          model._normalize(e2);
          
          // Calculate cross product
          let normal = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
          }
          
          // In case of tiling, make normals peripendicular on edges
          if (tile) {
            if (((tile.nx && faceName === 'nx') || (tile.px && faceName === 'px')) &&
                (vertex.y < voxels.minY+0.1 || vertex.y > voxels.maxY+0.9 ||
                 vertex.z < voxels.minZ+0.1 || vertex.z > voxels.maxZ+0.9)) { 
              normal.y = 0; normal.z = 0 
            };
            if (((tile.ny && faceName === 'ny') || (tile.py && faceName === 'py')) &&
                (vertex.x < voxels.minX+0.1 || vertex.x > voxels.maxX+0.9 ||
                 vertex.z < voxels.minZ+0.1 || vertex.z > voxels.maxZ+0.9)) { 
              normal.x = 0; normal.z = 0 
            };
            if (((tile.nz && faceName === 'nz') || (tile.pz && faceName === 'pz')) &&
                (vertex.x < voxels.minX+0.1 || vertex.x > voxels.maxX+0.9 ||
                 vertex.y < voxels.minY+0.1 || vertex.y > voxels.maxY+0.9)) { 
              normal.x = 0; normal.y = 0 
            };
          }

          model._normalize(normal);
          
          // Store the normal for all 4 vertices (used for flat lighting)
          face.normals[v] = normal;
                    
            // Average the normals weighed by angle
            // Since we're using the mid point we can be wrong on strongly deformed quads, but not noticable
            let mul = e1.x * e2.x + e1.y * e2.y + e1.z * e2.z;
            let angle = Math.acos(mul);
            
          // Add this normal to the vertex normal only in case of smooth lighting
          if (voxel.material.lighting === SVOX.SMOOTH || 
              (voxel.material.lighting === SVOX.BOTH && !face.flattened && !face.clamped && face.equidistant !== false)) {
            
              vertex.normal.x += angle * normal.x;
              vertex.normal.y += angle * normal.y;
              vertex.normal.z += angle * normal.z;
          }
          
          // But all count towards the averageNormal (which is used for the outline)
          vertex.averageNormal.x += angle * normal.x;
          vertex.averageNormal.y += angle * normal.y;
          vertex.averageNormal.z += angle * normal.z;

        }
      }
    }, this);
      
    // Normalize the vertex normals
    model.forEachVertex(function normalizeNormals(vertex) { 
      model._normalize(vertex.normal);      
      model._normalize(vertex.averageNormal);      
    }, this);    
    
    model.voxels.forEach(function calculateNormals(voxel) {
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped) 
          continue;
        
        if (voxel.material.lighting === SVOX.SMOOTH || 
              (voxel.material.lighting === SVOX.BOTH && !face.flattened && !face.clamped && face.equidistant !== false)) {
          
          face.normals = [
            model._isZero(face.vertices[0].normal) ? face.normals[0] : face.vertices[0].normal,
            model._isZero(face.vertices[1].normal) ? face.normals[1] : face.vertices[1].normal,
            model._isZero(face.vertices[2].normal) ? face.normals[2] : face.vertices[2].normal,
            model._isZero(face.vertices[3].normal) ? face.normals[3] : face.vertices[3].normal
          ];
        }
      }
    }, this);
    
    // Cleanup the vertex normals (no longer needed)
    model.forEachVertex(function(vertex) { 
      delete vertex.normal;
    }, this);    
  }  
  
}

// =====================================================
// /smoothvoxels/svox/lightscalculator.js
// =====================================================

class LightsCalculator {
  
  static calculateLights(model) {

    let lights = model.lights;
    if (lights.length === 0)
      return;
    
    for (let l = 0; l < lights.length; l++) {
      if (lights[l].direction)
        lights[l].normalizedDirection = model._normalize( { x:lights[l].direction.x, y:lights[l].direction.y, z:lights[l].direction.z } );
    }

    model.voxels.forEach(function(voxel) {

      // If this material is not affected by lights, no need to calculate the lights
      if (!voxel.material.lights)
        return;
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
      
        // If this face is skipped, no need to calculate the lights
        if (face.skipped)
          continue;
        
        face.light = [
          { r:0, g:0, b:0 },
          { r:0, g:0, b:0 }, 
          { r:0, g:0, b:0 }, 
          { r:0, g:0, b:0 } 
        ];
          
        for (let v = 0; v<4; v++) {

          let vertex = face.vertices[v];
          let normal = face.normals[v]; 
          
          for (let l = 0; l < lights.length; l++) {
            let light = lights[l];
            let exposure = light.strength;
            let normalizedDirection = light.normalizedDirection;
            let length = 0;
            if (light.position) {
              let vector = { x:light.position.x - vertex.x, 
                             y:light.position.y - vertex.y, 
                             z:light.position.z - vertex.z };
              length = Math.sqrt( vector.x * vector.x + vector.y * vector. y + vector.z * vector.z );
              normalizedDirection = { x:vector.x/length, y:vector.y/length, z:vector.z/length };
            }
            if (normalizedDirection) {
              exposure = light.strength * 
                         Math.max(normal.x*normalizedDirection.x + 
                                  normal.y*normalizedDirection.y + 
                                  normal.z*normalizedDirection.z, 0.0);
            }
            if (light.position && light.distance) {
              exposure = exposure * (1 - Math.min(length / light.distance, 1));
            }
            face.light[v].r += light.color.r * exposure;
            face.light[v].g += light.color.g * exposure;
            face.light[v].b += light.color.b * exposure;
          }
        }
      }
    }, this, true);  // true == visible voxels only 
  } 

}

// =====================================================
// /smoothvoxels/svox/aocalculator.js
// =====================================================

class AOCalculator {
  
  static calculateAmbientOcclusion(model) {
    let doAo = model.ao || model.materials.find(function(m) { return m.ao; } );
    if (!doAo) 
      return;
             
    let triangles = this._getAllFaceTriangles(model);
    let octree = this._trianglesToOctree(triangles);
    octree = this._aoSidesToOctree(model, octree);

    let nrOfSamples = model.aoSamples;
    let samples = this._generateFibonacciSamples(nrOfSamples);
    
    model.triCount = 0;
    model.octCount = 0;

    let cache = {};
    
    model.voxels.forEach(function calculateAO(voxel) {
      let ao = voxel.material.ao || model.ao;
      if (!ao || ao.maxDistance === 0 || ao.strength === 0 || ao.angle < 1 || voxel.material.opacity === 0)
        return;

      let max = ao.maxDistance * Math.max(model.scale.x, model.scale.y, model.scale.z);
      let strength = ao.strength;
      let angle = Math.cos(ao.angle / 180 * Math.PI);

      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped)
          continue;
        
        face.ao[0] = 0; face.ao[1] = 0; face.ao[2] = 0; face.ao[3] = 0;
          
        for (let v = 0; v<4; v++) {

          let vertex = face.vertices[v];
          let normal = face.normals[v];        
          
          let cacheKey = `${vertex.x}|${vertex.y}|${vertex.z}|${normal.x}|${normal.y}|${normal.z}`;
          let cachedAo = cache[cacheKey];
          if (cachedAo) {
            face.ao[v] = cachedAo;
            continue;
          }
                              
          // Move the ray origin out of the corner and out of the plane.
          let opposite = face.vertices[(v+2) % 4];
          let origin    = { 
            x: vertex.x * 0.99999 + opposite.x * 0.00001 + normal.x/10000,
            y: vertex.y * 0.99999 + opposite.y * 0.00001 + normal.y/10000,
            z: vertex.z * 0.99999 + opposite.z * 0.00001 + normal.z/10000
          }
          
          let total = 0;
          let count = 0;

          for (let s = 0; s < nrOfSamples; s++) {
            let sample = samples[s];
            let dot = sample.x*normal.x + sample.y*normal.y + sample.z*normal.z;
            if (dot <= angle) continue;
            
            let distance = AOCalculator._distanceToOctree(model, origin, sample, max, octree);
            distance = (distance || max) / max;
            total += distance; 
            count++;
          }
          
          if (count === 0)
            face.ao[v] = 0;
          else {
            total = Math.max(Math.min(total/count, 1), 0);
            
            face.ao[v] = 1 - Math.pow(total, strength);  
          }
          
          cache[cacheKey] = face.ao[v];

        }
      }
    }, this, true);  // true == visible voxels only 
    
    //console.log(`Oct: ${model.octCount}  OctMiss: ${model.octMissCount}  Tri: ${model.triCount}`);
  }
   
  static _getAllFaceTriangles(model) {
    let triangles = [];
    model.voxels.forEach(function(voxel) {
      if (voxel.material.opacity < 0.75) return;

      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped) 
          continue;
            
        triangles.push([face.vertices[2], face.vertices[1], face.vertices[0]]);
        triangles.push([face.vertices[0], face.vertices[3], face.vertices[2]]);        
      }
    }, this, true); // Visible only
        
    return triangles;
  }
  
  static _trianglesToOctree(triangles) {
    let length = triangles.length;

    if (length <= 32) {
      
      let partition = { 
        minx: Number.MAX_VALUE, miny: Number.MAX_VALUE, minz: Number.MAX_VALUE,
        maxx: -Number.MAX_VALUE, maxy: -Number.MAX_VALUE, maxz: -Number.MAX_VALUE,
        triangles: triangles
      }
      
      for(let t=0; t<length; t++) {
        let triangle = triangles[t];
        partition.minx = Math.min(partition.minx, triangle[0].x, triangle[1].x, triangle[2].x);
        partition.miny = Math.min(partition.miny, triangle[0].y, triangle[1].y, triangle[2].y);
        partition.minz = Math.min(partition.minz, triangle[0].z, triangle[1].z, triangle[2].z);
        partition.maxx = Math.max(partition.maxx, triangle[0].x, triangle[1].x, triangle[2].x);
        partition.maxy = Math.max(partition.maxy, triangle[0].y, triangle[1].y, triangle[2].y);
        partition.maxz = Math.max(partition.maxz, triangle[0].z, triangle[1].z, triangle[2].z);
      }
      return partition;
      
    }
    else {
      
      let midx = 0, midy = 0, midz = 0;
      for(let t=0; t<length; t++) {
        let triangle = triangles[t];
        midx += triangle[0].x + triangle[1].x + triangle[2].x;
        midy += triangle[0].y + triangle[1].y + triangle[2].y;
        midz += triangle[0].z + triangle[1].z + triangle[2].z;
      }
      midx /= length;   // Don't devide by 3 so we don't have to do that below
      midy /= length;
      midz /= length;
      
      let partitions = []
      for(let t=0; t<length; t++) {
        let triangle = triangles[t];
        let x = (triangle[0].x + triangle[1].x + triangle[2].x) < midx ? 0 : 1;
        let y = (triangle[0].y + triangle[1].y + triangle[2].y) < midy ? 0 : 1;
        let z = (triangle[0].z + triangle[1].z + triangle[2].z) < midz ? 0 : 1;
        let index = x + y*2 + z*4;
        if (partitions[index])
          partitions[index].push(triangle);
        else
          partitions[index] = [ triangle ];
      }
        
      let partition = {
        minx: Number.MAX_VALUE, miny: Number.MAX_VALUE, minz: Number.MAX_VALUE,
        maxx: -Number.MAX_VALUE, maxy: -Number.MAX_VALUE, maxz: -Number.MAX_VALUE,  
        partitions: partitions
      };
      
      for (let index = 7; index >= 0; index--) {
        if (!partitions[index]) 
          partitions.splice(index, 1);
        else {
          partitions[index] = AOCalculator._trianglesToOctree(partitions[index]);
          partition.minx = Math.min(partition.minx, partitions[index].minx);
          partition.miny = Math.min(partition.miny, partitions[index].miny);
          partition.minz = Math.min(partition.minz, partitions[index].minz);
          partition.maxx = Math.max(partition.maxx, partitions[index].maxx);
          partition.maxy = Math.max(partition.maxy, partitions[index].maxy);
          partition.maxz = Math.max(partition.maxz, partitions[index].maxz);
        }
      }
        
      return partition;        
    }
  }  
   
  static _distanceToOctree(model, origin, direction, max, octree, end) {
    
    model.octCount++;
    if (!end)
      end = { x: origin.x + direction.x * max, y: origin.y + direction.y * max, z: origin.z + direction.z * max };
    
    if (!AOCalculator._hitsBox(origin, end, octree))
      return null;
    
    if (octree.triangles) {
      let dist =  AOCalculator._distanceToModel(model, origin, direction, max, octree.triangles);
      if (!dist) 
        model.octMissCount++; 
      return dist;
    }

    let minDistance = max;
    for (let p=0; p < octree.partitions.length; p++) { 
      let dist = AOCalculator._distanceToOctree(model, origin, direction, max, octree.partitions[p], end);
      if (dist) {
        minDistance = Math.min(minDistance, dist);
      }      
    }    
    return minDistance;    
  }
  
  static _aoSidesToOctree(model, octree) {
    let bounds = model._determineBounds().bounds;
    
    let sideTriangles = [];
    if (model._aoSides.nx) 
      sideTriangles.push ( [ { x:bounds.minX-0.05, y:  1000000, z:-1000000 }, 
                             { x:bounds.minX-0.05, y:  1000000, z: 1000000 }, 
                             { x:bounds.minX-0.05, y:-10000000, z:      0 } ] );
    if (model._aoSides.px) 
      sideTriangles.push ( [ { x:bounds.maxX+0.05, y: 1000000,  z: 1000000 }, 
                             { x:bounds.maxX+0.05, y: 1000000,  z:-1000000 }, 
                             { x:bounds.maxX+0.05, y:-10000000, z:       0 } ] );
    if (model._aoSides.ny) 
      sideTriangles.push ( [ { x: 1000000, y:bounds.minY-0.05, z:-1000000 }, 
                             { x:-1000000, y:bounds.minY-0.05, z:-1000000 }, 
                             { x:       0, y:bounds.minY-0.05, z:10000000 } ] );
    if (model._aoSides.py) 
      sideTriangles.push ( [ { x:-1000000, y:bounds.maxY+0.05, z:-1000000 }, 
                             { x: 1000000, y:bounds.maxY+0.05, z:-1000000 }, 
                             { x:       0, y:bounds.maxY+0.05, z:10000000 } ] );
    if (model._aoSides.nz) 
      sideTriangles.push ( [ { x: 1000000, y: 1000000,  z:bounds.minZ-0.05 }, 
                             { x:-1000000, y: 1000000,  z:bounds.minZ-0.05 }, 
                             { x:       0, y:-10000000, z:bounds.minZ-0.05 } ] );
    if (model._aoSides.pz) 
      sideTriangles.push ( [ { x:-1000000, y: 1000000,  z:bounds.maxZ+0.05 }, 
                             { x: 1000000, y: 1000000,  z:bounds.maxZ+0.05 }, 
                             { x:       0, y:-10000000, z:bounds.maxZ+0.05 } ] );    
    
    if (sideTriangles.length > 0) {
      let sideOctree = AOCalculator._trianglesToOctree(sideTriangles);
      octree = { 
          minx: -Number.MAX_VALUE, miny: -Number.MAX_VALUE, minz: -Number.MAX_VALUE,
          maxx: Number.MAX_VALUE, maxy: Number.MAX_VALUE, maxz: Number.MAX_VALUE,
          
          // Combine the sideOctree with the octree
          partitions: [ octree, sideOctree ]
        }
    }
    
    return octree;
  }
  
  static _hitsBox(origin, end, box) {
    // Check if the entire line is fuly outside of the box planes
    if (origin.x < box.minx && end.x < box.minx) return false;
    if (origin.x > box.maxx && end.x > box.maxx) return false;
    if (origin.y < box.miny && end.y < box.miny) return false;
    if (origin.y > box.maxy && end.y > box.maxy) return false;
    if (origin.z < box.minz && end.z < box.minz) return false;
    if (origin.z > box.maxz && end.z > box.maxz) return false;
    
    // Check if the origin is in the box
    if (origin.x >= box.minx && origin.x <= box.maxx &&
        origin.y >= box.miny && origin.y <= box.maxy &&
        origin.z >= box.minz && origin.z <= box.maxz) return true;
    
    // Check if the line hits the negative x side
    if (origin.x < end.x) {
      let d = (box.minx - origin.x) / (end.x - origin.x);
      let hity = origin.y + d * (end.y - origin.y); 
      let hitz = origin.z + d * (end.z - origin.z); 
      if (hity >= box.miny && hity <= box.maxy &&
          hitz >= box.minz && hitz <= box.maxz) return true;
    }

    // Check if the line hits the positive x side 
    if (origin.x > end.x) {
      let d = (box.maxx - origin.x) / (end.x - origin.x);
      let hity = origin.y + d * (end.y - origin.y); 
      let hitz = origin.z + d * (end.z - origin.z); 
      if (hity >= box.miny && hity <= box.maxy &&
          hitz >= box.minz && hitz <= box.maxz) return true;
    }
    
    // Check if the line hits the negative y side
    if (origin.y < end.y) {
      let d = (box.miny - origin.y) / (end.y - origin.y);
      let hitx = origin.x + d * (end.x - origin.x); 
      let hitz = origin.z + d * (end.z - origin.z); 
      if (hitx >= box.minx && hitx <= box.maxx &&
          hitz >= box.minz && hitz <= box.maxz) return true;
    }

    // Check if the line hits the positive y side
    if (origin.y > end.y) {
      let d = (box.maxy - origin.y) / (end.y - origin.y);
      let hitx = origin.x + d * (end.x - origin.x); 
      let hitz = origin.z + d * (end.z - origin.z); 
      if (hitx >= box.minx && hitx <= box.maxx &&
          hitz >= box.minz && hitz <= box.maxz) return true;
    }

    // Check if the line hits the negative z side
    if (origin.z < end.z) {
      let d = (box.minz - origin.z) / (end.z - origin.z);
      let hitx = origin.x + d * (end.x - origin.x); 
      let hity = origin.y + d * (end.y - origin.y); 
      if (hitx >= box.minx && hitx <= box.maxx &&
          hity >= box.miny && hity <= box.maxy) return true;
    }

    // Check if the line hits the positive z side
    if (origin.z > end.z) {
      let d = (box.maxz - origin.z) / (end.z - origin.z);
      let hitx = origin.x + d * (end.x - origin.x); 
      let hity = origin.y + d * (end.y - origin.y); 
      if (hitx >= box.minx && hitx <= box.maxx &&
          hity >= box.miny && hity <= box.maxy) return true;
    }

    return false;
  }
   
  static _distanceToModel(model, vertex, direction, max, triangles) {  
    let minDistance = null;
    
    for (let t=0; t < triangles.length; t++) {
      let triangle = triangles[t];
      
      let dist = this._triangleDistance(model, vertex, direction, triangle[0], triangle[1], triangle[2]);
      if (dist) {
        if (!minDistance) {
          if (dist < max)
            minDistance = dist;
        }
        else
          minDistance = Math.min(minDistance, dist);
      }      
    }
    
    return minDistance;    
  }
  
  // Ray - triangle Möller–Trumbore intersection algorithm
  // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
  // Adapted to return distance and minimize object allocations
  // Note: direction must be normalized.
  static _triangleDistance(model, origin, direction, vertex0, vertex1, vertex2) {

    model.triCount++;

    let edge1x = vertex1.x - vertex0.x;
    let edge1y = vertex1.y - vertex0.y;
    let edge1z = vertex1.z - vertex0.z;
    let edge2x = vertex2.x - vertex0.x;
    let edge2y = vertex2.y - vertex0.y;
    let edge2z = vertex2.z - vertex0.z;
    
    // h = crossProduct(direction, edge2)
    let h0 = direction.y * edge2z - direction.z * edge2y;
    let h1 = direction.z * edge2x - direction.x * edge2z; 
    let h2 = direction.x * edge2y - direction.y * edge2x;
    
    // a = dotProduct(edge1, h)
    let a = edge1x * h0 + edge1y * h1 + edge1z * h2;
    if (a < Number.EPSILON)
        return null;    // This ray is parallel to this triangle.
    
    let f = 1.0/a;
    let sx = origin.x - vertex0.x;
    let sy = origin.y - vertex0.y;
    let sz = origin.z - vertex0.z;
    
    // u = f * dotProduct(s, h);
    let u = f * (sx * h0 + sy * h1 + sz * h2);
    if (u < 0.0 || u > 1.0)  // > a?
        return null;
    
    // q = crossProduct(s, edge1)
    let q0 = sy * edge1z - sz * edge1y;
    let q1 = sz * edge1x - sx * edge1z;
    let q2 = sx * edge1y - sy * edge1x;
    
    // v = f * dotProduct(direction, q);
    let v = f * (direction.x * q0 + direction.y * q1 + direction.z * q2);
    if (v < 0.0 || u + v > 1.0)   // > a? 
        return null;
    
    // At this stage we can compute t to find out where the intersection point is on the line.
    // t = f * dotProduct(edge2, q)
    let t = f * (edge2x * q0 + edge2y * q1 + edge2z * q2);
    if (t <= Number.EPSILON) 
        return null;  // This means that there is a line intersection but not a ray intersection.
      
    // Ray intersection is at:
    // { x:origin.x + rayVector.x * t, y:origin.y + rayVector.y * t, z:origin.z + rayVector.z * t }
    // But we're only interested in the distance (t)
    
    // Discard the face of origin
    //if (t < 0.001)
    // return null;
    
    //console.log(`a:${a} u:${u} v:${v} t:${t}`);
    
    return t;
  }
  
  
  // Generate the samples using a Fibonacci Spiral
  // https://bduvenhage.me/geometry/2019/07/31/generating-equidistant-vectors.html
  static _generateFibonacciSamples(count) {
    let samples = [];
   
    let gr = (Math.sqrt(5.0) + 1.0) / 2.0;  // golden ratio = 1.6180339887498948482
    let ga = (2.0 - gr) * (2.0*Math.PI);    // golden angle = 2.39996322972865332

    for (let i=1; i <= count; ++i) {
        let lat = Math.asin(-1.0 + 2.0 * i / (count+1));
        let lon = ga * i;

        let x = Math.cos(lon)*Math.cos(lat);
        let y = Math.sin(lat);
        let z = Math.sin(lon)*Math.cos(lat);

        //samples.push( { x:x, y:y*1.25+0.5, z:z } ); // Elongate and move up for light from above
        samples.push( { x:x, y:y, z:z } );
    }
    
    return samples;
  }
  
  // Generate the samples using a regular spaced grid based on an octahedron.
  // The vertical count between 1 and 10 gives the folowing numbers of samples:
  //    6, 18, 38, 66, 102, 146, 198, 258, 326, 402
  // In theory this regular grid should produce less asymmetric artefacts, however
  // vertical count 1 and 2 have too few samples for normal use and 3 (38 samples) and higher
  // provide only marginal improvements over the Fibonacci spiral above.
  // Since the Fibonacci spiral provides any number of samples that was the final choice. 
  static _generateOctahedronSamples(verticalCount) {
    let samples = [];

    let verticalAngle = Math.PI / 2 / verticalCount;

    for (let vc=0; vc <= verticalCount; vc++) {
      let va = vc * verticalAngle;
      let y = Math.cos(va); 
      let d = Math.sin(va);

      let horizontalCount = Math.max(1, vc * 4);
      let horizontalAngle = Math.PI * 2 / horizontalCount; 

      for (let hc=0; hc < horizontalCount; hc++) {
        let ha = hc * horizontalAngle;
        let x = d * Math.sin(ha);
        let z = d * Math.cos(ha);

        samples.push( { x:x, y:y, z:z } );
        if (vc < verticalCount)
          samples.push( { x:x, y:-y, z:z } );
      }

      horizontalCount += 4;
    }

    return samples;
  }
  
}

// =====================================================
// /smoothvoxels/svox/colorcombiner.js
// =====================================================

class ColorCombiner {
  
  static combineColors(model) {
    // No need to fade colors when there is no material with fade
    let fade = model.materials.find(m => m.colors.length > 1 && m.fade) ? true : false;
    
    model.voxels.forEach(function combine(voxel) {
      let fadeVoxel = (fade && voxel.material.fade && voxel.material.colors.length > 1);

      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face && !face.skipped) {
          
          if (!fadeVoxel) {
            // No fading, so no per vertex colors
            delete face.vertexColors;
          }
          else {
            // Fade the colors
            this._fadeFaceColor(voxel, face);
          }   
          
          // Combine AO + Lights + Face color(s)
          this._combineFaceColors(model, voxel, face);                   
        }  
      }
    }, this);
  }
       
  static _fadeFaceColor(voxel, face) {
    face.vertexColors = [ null, null, null, null ];
    for (let v = 0; v < 4; v++) {
      let vert = face.vertices[v];
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;    

      for (let c = 0; c < vert.colors.length; c++) {
        let col = vert.colors[c];
        if (col.material === voxel.material) {
          r += col.r; 
          g += col.g; 
          b += col.b; 
          count++;
        }
      }

      face.vertexColors[v] = Color.fromRgb(r / count, g / count, b / count);
    }    
  }
  
  static _combineFaceColors(model, voxel, face) {
    if (voxel.material.colorCount === 1 && !voxel.material.ao && !model.ao && model.lights.length === 0) {
      // Color is set in the material
    }
    else if (voxel.material.colorCount > 1 && !voxel.material.ao && !model.ao && model.lights.length === 0 && !face.vertexColors) {
        // Face colors
        face.color  = voxel.color;
    }
    else {

      // The combined result is stored in the vertexColors
      face.vertexColors = face.vertexColors || [ voxel.color.clone(), voxel.color.clone(), voxel.color.clone(), voxel.color.clone() ];      

      let colors = face.vertexColors;
      let light = face.light || [ {r:1, g:1, b:1}, {r:1, g:1, b:1}, {r:1, g:1, b:1}, {r:1, g:1, b:1} ];
      let ao = face.ao;

      // Calculate the vertex colors including Ambient Occlusion (when used)
      for (let v = 0; v < 4; v++) {
        let vColor = colors[v];
        let vLight = light[v];
        let vAo = (1 - ao[v]);
        let vAoColor = voxel.material.ao ? voxel.material.ao.color : model.ao ? model.ao.color : vColor;

        vColor.r = vLight.r * vAo * vColor.r + vAoColor.r * (1 - vAo); 
        vColor.g = vLight.g * vAo * vColor.g + vAoColor.g * (1 - vAo); 
        vColor.b = vLight.b * vAo * vColor.b + vAoColor.b * (1 - vAo); 
      }      
    }    
  }
  
}

// =====================================================
// /smoothvoxels/svox/uvassigner.js
// =====================================================

class UVAssigner {
  
    static assignUVs(model) {
      
      model.voxels.forEach(function(voxel) {
        let material = voxel.material;
        
        // We're always calculating UV's since even when the voxel does not use them, the shell might need them
        
        let useOffset = 0;  // Simple (per voxel) textures don't need offsets per side
        let uscale = 1;
        let vscale = 1;

        if (material.map || material.normalMap || material.roughnessMap || material.metalnessMap || material.emissiveMap) {
          
          if (material.mapTransform.uscale === -1) {
            uscale = 1 / Math.max(model.voxels.size.x, model.voxels.size.y, model.voxels.size.z);
          }       

          if (material.mapTransform.vscale === -1) {
            vscale = 1 / Math.max(model.voxels.size.x, model.voxels.size.y, model.voxels.size.z);
          }       
          
          if ((material.map && material.map.cube) || 
              (material.normalMap && material.normalMap.cube) ||
              (material.roughnessMap && material.roughnessMap.cube) ||
              (material.metalnessMap && material.metalnessMap.cube) ||
              (material.emissiveMap && material.emissiveMap.cube)) {
            useOffset = 1;        // Use the offsets per face in the cube texture
            uscale = uscale / 4;  // The cube texture is 4 x 2
            vscale = vscale / 2;
          }
        
        }

        for (let faceName in voxel.faces) {
          let face = voxel.faces[faceName];
          if (face.skipped)
            continue;
          
          let faceUVs = SVOX._FACEUVS[faceName];
          face.uv = [];
          face.uv[faceUVs.order[0]] = { u:useOffset*faceUVs.uo+(voxel[faceUVs.u]+0.0001)*faceUVs.ud*uscale, v:useOffset*faceUVs.vo+(voxel[faceUVs.v]+0.0001)*faceUVs.vd*vscale }; 
          face.uv[faceUVs.order[1]] = { u:useOffset*faceUVs.uo+(voxel[faceUVs.u]+0.0001)*faceUVs.ud*uscale, v:useOffset*faceUVs.vo+(voxel[faceUVs.v]+0.9999)*faceUVs.vd*vscale }; 
          face.uv[faceUVs.order[2]] = { u:useOffset*faceUVs.uo+(voxel[faceUVs.u]+0.9999)*faceUVs.ud*uscale, v:useOffset*faceUVs.vo+(voxel[faceUVs.v]+0.9999)*faceUVs.vd*vscale }; 
          face.uv[faceUVs.order[3]] = { u:useOffset*faceUVs.uo+(voxel[faceUVs.u]+0.9999)*faceUVs.ud*uscale, v:useOffset*faceUVs.vo+(voxel[faceUVs.v]+0.0001)*faceUVs.vd*vscale };
        }
      }, this, false);  
  }
}

// =====================================================
// /smoothvoxels/svox/simplifier.js
// =====================================================

class Simplifier {
  
  // Combine all faces which are coplanar, have the same normals, colors, etc.
  static simplify(model) {
    
    let context1 = { };
    let context2 = { };
    let context3 = { };
    let context4 = { };

    let clearContexts = function() {
      context1.lastVoxel = null;
      context2.lastVoxel = null;
      context3.lastVoxel = null;
      context4.lastVoxel = null;      
    }
    
    // Combine nx, px, nz and pz faces vertical up
    for (let x = model.voxels.minX; x <= model.voxels.maxX; x++) {
      for (let z = model.voxels.minZ; z <= model.voxels.maxZ; z++) {
        for (let y = model.voxels.minY; y <= model.voxels.maxY; y++) {
          let voxel = model.voxels.getVoxel(x,y,z); 
          if (voxel) {
            Simplifier._mergeFaces(context1, voxel, 'x', 'z', 'y', 'nx', 0, 1, 2, 3);
            Simplifier._mergeFaces(context2, voxel, 'x', 'z', 'y', 'px', 0, 1, 2, 3);
            Simplifier._mergeFaces(context3, voxel, 'x', 'z', 'y', 'nz', 0, 1, 2, 3);
            Simplifier._mergeFaces(context4, voxel, 'x', 'z', 'y', 'pz', 0, 1, 2, 3);
          }
          else
             clearContexts();
        }
      }
    }
    
    // Combine nx, px, ny and py faces from back to front
    clearContexts();
    for (let x = model.voxels.minX; x <= model.voxels.maxX; x++) {
      for (let y = model.voxels.minY; y <= model.voxels.maxY; y++) {
        for (let z = model.voxels.minZ; z <= model.voxels.maxZ; z++) {
          let voxel = model.voxels.getVoxel(x,y,z); 
          if (voxel) {
            Simplifier._mergeFaces(context1, voxel, 'x', 'y', 'z', 'nx', 1, 2, 3, 0);
            Simplifier._mergeFaces(context2, voxel, 'x', 'y', 'z', 'px', 3, 0, 1, 2);
            Simplifier._mergeFaces(context3, voxel, 'x', 'y', 'z', 'ny', 0, 1, 2, 3);
            Simplifier._mergeFaces(context4, voxel, 'x', 'y', 'z', 'py', 2, 3, 0, 1);
          }
          else
            clearContexts();
        }
      }
    }
    
    // Combine ny, py, nz and pz faces from left to right
    clearContexts();
    for (let y = model.voxels.minY; y <= model.voxels.maxY; y++) {
      for (let z = model.voxels.minZ; z <= model.voxels.maxZ; z++) {
        for (let x = model.voxels.minX; x <= model.voxels.maxX; x++) {
          let voxel = model.voxels.getVoxel(x,y,z); 
          if (voxel) {
            Simplifier._mergeFaces(context1, voxel, 'y', 'z', 'x', 'ny', 1, 2, 3, 0);
            Simplifier._mergeFaces(context2, voxel, 'y', 'z', 'x', 'py', 1, 2, 3, 0);
            Simplifier._mergeFaces(context3, voxel, 'y', 'z', 'x', 'nz', 3, 0, 1, 2);
            Simplifier._mergeFaces(context4, voxel, 'y', 'z', 'x', 'pz', 1, 2, 3, 0);
          }
          else
            clearContexts();
        }
      }
    }

  }
  
  // axis 3 is the movement direction
  // v1, v2 of the last face are candidates for removal
  static _mergeFaces(context, voxel, axis1, axis2, axis3, faceName, v0, v1, v2, v3) {
    let face = null;
    if (voxel)
      face = voxel.faces[faceName];

    if (voxel && context.lastVoxel && 
        face && !face.skipped  && context.lastFace &&
        voxel.color === context.lastVoxel.color &&
        voxel[axis1] === context.lastVoxel[axis1] &&
        voxel[axis2] === context.lastVoxel[axis2]) {
        
        let faceNormals = face.normals;
        let lastFaceNormals = context.lastFace.normals;
        let faceVertexColors = face.vertexColors;
        let lastFaceVertexColors = context.lastFace.vertexColors;
        let faceVertices = face.vertices;
        let lastFaceVertices = context.lastFace.vertices;
        let faceAo = face.ao; 
        let lastFaceAo = context.lastFace.ao; 
      
        // Calculate the ratio between the face length and the total face length (in case they are combined)
        let faceLength = Math.sqrt(
                          (faceVertices[v1].x - faceVertices[v0].x) * (faceVertices[v1].x - faceVertices[v0].x) +
                          (faceVertices[v1].y - faceVertices[v0].y) * (faceVertices[v1].y - faceVertices[v0].y) +
                          (faceVertices[v1].z - faceVertices[v0].z) * (faceVertices[v1].z - faceVertices[v0].z)
                        );
        let totalLength = Math.sqrt(
                          (faceVertices[v1].x - lastFaceVertices[v0].x) * (faceVertices[v1].x - lastFaceVertices[v0].x) +
                          (faceVertices[v1].y - lastFaceVertices[v0].y) * (faceVertices[v1].y - lastFaceVertices[v0].y) +
                          (faceVertices[v1].z - lastFaceVertices[v0].z) * (faceVertices[v1].z - lastFaceVertices[v0].z)
                        ); 
        let ratio = faceLength / totalLength;
      
        if (Simplifier._normalEquals(faceNormals[0], lastFaceNormals[0]) && 
            Simplifier._normalEquals(faceNormals[1], lastFaceNormals[1]) && 
            Simplifier._normalEquals(faceNormals[2], lastFaceNormals[2]) && 
            Simplifier._normalEquals(faceNormals[3], lastFaceNormals[3]) &&
            ( 
              (!faceVertexColors && !lastFaceVertexColors) || (
                Simplifier._colorEquals(faceVertexColors[0], lastFaceVertexColors[0]) &&
                Simplifier._colorEquals(faceVertexColors[1], lastFaceVertexColors[1]) &&
                Simplifier._colorEquals(faceVertexColors[2], lastFaceVertexColors[2]) &&
                Simplifier._colorEquals(faceVertexColors[3], lastFaceVertexColors[3]) 
              )
            ) && 
            faceAo[0] === lastFaceAo[0] &&
            faceAo[1] === lastFaceAo[1] &&
            faceAo[2] === lastFaceAo[2] &&
            faceAo[3] === lastFaceAo[3] &&
            
            (false || (
              Math.abs(lastFaceVertices[v1][axis1] - (1-ratio) * faceVertices[v1][axis1] - ratio * lastFaceVertices[v0][axis1]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v1][axis2] - (1-ratio) * faceVertices[v1][axis2] - ratio * lastFaceVertices[v0][axis2]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v1][axis3] - (1-ratio) * faceVertices[v1][axis3] - ratio * lastFaceVertices[v0][axis3]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v2][axis1] - (1-ratio) * faceVertices[v2][axis1] - ratio * lastFaceVertices[v3][axis1]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v2][axis2] - (1-ratio) * faceVertices[v2][axis2] - ratio * lastFaceVertices[v3][axis2]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v2][axis3] - (1-ratio) * faceVertices[v2][axis3] - ratio * lastFaceVertices[v3][axis3]) <= Number.EPSILON * 10 ))
           ) 
        {
          // Everything checks out, so add this face to the last one
          //console.log(`MERGE: ${Simplifier._faceVerticesToString(lastFaceVertices)}`);
          //console.log(`  AND: ${Simplifier._faceVerticesToString(faceVertices)}`);
          lastFaceVertices[v1] = faceVertices[v1];
          lastFaceVertices[v2] = faceVertices[v2];
          //console.log(`   TO: ${Simplifier._faceVerticesToString(lastFaceVertices)}`);
          
          context.lastFace.uv[v1] = face.uv[v1];
          context.lastFace.uv[v2] = face.uv[v2];
          
          // And remove this face
          delete voxel.faces[faceName];
          return;
        }
    }

    context.lastVoxel = voxel;
    context.lastFace = face;
  }
  
  
  static _normalEquals(vector1, vector2) {
    return Math.abs(vector1.x - vector2.x) < 0.01 && // Allow for minimal differences
           Math.abs(vector1.y - vector2.y) < 0.01 && 
           Math.abs(vector1.z - vector2.z) < 0.01;
  }
  
  static _colorEquals(color1, color2) {
    return color1.r === color2.r &&
           color1.g === color2.g &&
           color1.b === color2.b;
  }  
  
  static _faceVerticesToString(vertices) {
    return `[`+
           `${Simplifier._vertexToString(vertices[0],0)},` +
           `${Simplifier._vertexToString(vertices[1],0)},` +
           `${Simplifier._vertexToString(vertices[2],0)},` +
           `${Simplifier._vertexToString(vertices[3],0)}` +
           `]`;
  }
  
  static _vertexToString(vertex, decimals) {
    return `{${vertex.x.toFixed(decimals)},${vertex.y.toFixed(decimals)},${vertex.z.toFixed(decimals)}}`;
  }
    
}

// =====================================================
// /smoothvoxels/svox/facealigner.js
// =====================================================

class FaceAligner {
     
  // Align all 'quad' diagonals to the center, making most models look more symmetrical
  static alignFaceDiagonals(model) {
    model.forEachVertex(function(vertex) { 
      vertex.count = 0;
    }, this);
    
    let maxDist = 0.1 * Math.min(model.scale.x, model.scale.y, model.scale.z);
    maxDist *= maxDist; // No need to use sqrt for the distances
    
    model.voxels.forEach(function(voxel) {
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped)
          continue;

        face.vertices[0].count++; 
        face.vertices[1].count++; 
        face.vertices[2].count++; 
        face.vertices[3].count++; 

        // Determine the diagonal for v0 - v2 mid point and the distances from v1 and v3 to that mid point 
        let mid02X = (face.vertices[0].x + face.vertices[2].x)/2;
        let mid02Y = (face.vertices[0].y + face.vertices[2].y)/2;
        let mid02Z = (face.vertices[0].z + face.vertices[2].z)/2;
        let distance1toMid = (face.vertices[1].x - mid02X) * (face.vertices[1].x - mid02X) + 
                             (face.vertices[1].y - mid02Y) * (face.vertices[1].y - mid02Y) + 
                             (face.vertices[1].z - mid02Z) * (face.vertices[1].z - mid02Z); 
        let distance3toMid = (face.vertices[3].x - mid02X) * (face.vertices[3].x - mid02X) + 
                             (face.vertices[3].y - mid02Y) * (face.vertices[3].y - mid02Y) + 
                             (face.vertices[3].z - mid02Z) * (face.vertices[3].z - mid02Z); 

        // Determine the diagonal for v1 - v3 mid point and the distances from v0 and v2 to that mid point 
        let mid13X = (face.vertices[1].x + face.vertices[3].x)/2;
        let mid13Y = (face.vertices[1].y + face.vertices[3].y)/2;
        let mid13Z = (face.vertices[1].z + face.vertices[3].z)/2;
        let distance0toMid = (face.vertices[0].x - mid13X) * (face.vertices[0].x - mid13X) + 
                             (face.vertices[0].y - mid13Y) * (face.vertices[0].y - mid13Y) + 
                             (face.vertices[0].z - mid13Z) * (face.vertices[0].z - mid13Z); 
        let distance2toMid = (face.vertices[2].x - mid13X) * (face.vertices[2].x - mid13X) + 
                             (face.vertices[2].y - mid13Y) * (face.vertices[2].y - mid13Y) + 
                             (face.vertices[2].z - mid13Z) * (face.vertices[2].z - mid13Z); 

        // NOTE: The check below is not an actual check for concave quads but 
        // checks whether one of the vertices is close to the midpoint of te other diagonal.
        // This can happen in certain cases when deforming, when the vertex itself is not moved, 
        // but two vertices it is dependant on are moved in the 'wrong' direction, resulting 
        // in a concave quad. Since deforming should not make the quad very badly concave
        // this seems enough to prevent ugly artefacts in these edge cases.

        if (distance1toMid < maxDist || distance3toMid < maxDist) {
          // If v1 or v3 is close to the mid point we may have a rare concave quad.
          // Switch the default triangles so this does not show up
          face.vertices.push(face.vertices.shift());
          face.normals.push(face.normals.shift());
          face.ao.push(face.ao.shift());
          face.uv.push(face.uv.shift());
          if (face.vertexColors)
              face.vertexColors.push(face.vertexColors.shift());
        } 
        else if (distance0toMid < maxDist || distance2toMid < maxDist) {
          // If v0 or v2 is close to the mid point we may have a rare concave quad.
          // Keep the default triangles so this does not show up.
        }
        else if (face.ao && 
                 Math.min(face.ao[0], face.ao[1], face.ao[2], face.ao[3]) !==
                 Math.max(face.ao[0], face.ao[1], face.ao[2], face.ao[3])) {
          // This is a 'standard' quad but wiht an ao gradient 
          // Rotate the vertices so they connect the highest contrast 
          let ao02 = Math.abs(face.ao[0] - face.ao[2]);
          let ao13 = Math.abs(face.ao[1] - face.ao[3]);
          if (ao02 < ao13) {
            face.vertices.push(face.vertices.shift());
            face.normals.push(face.normals.shift());
            face.ao.push(face.ao.shift());
            face.uv.push(face.uv.shift());
            if (face.vertexColors)
              face.vertexColors.push(face.vertexColors.shift());
          }                        
        }
        else {
          // This is a 'standard' quad. 
          // Rotate the vertices so they align to the center
          // For symetric models this improves the end result
          let min = FaceAligner._getVertexSum(face.vertices[0]);
          while (FaceAligner._getVertexSum(face.vertices[1]) < min || 
                 FaceAligner._getVertexSum(face.vertices[2]) < min || 
                 FaceAligner._getVertexSum(face.vertices[3]) < min) {
            face.vertices.push(face.vertices.shift());
            face.normals.push(face.normals.shift());
            face.ao.push(face.ao.shift());
            face.uv.push(face.uv.shift());              
            if (face.vertexColors)
              face.vertexColors.push(face.vertexColors.shift());
            min = FaceAligner._getVertexSum(face.vertices[0]);
          }            
        }
      
      }
    }, this);
  }
  
  static _getVertexSum(vertex) {
    return Math.abs(vertex.x) + Math.abs(vertex.y) + Math.abs(vertex.z);
  }  
   
}

// =====================================================
// /smoothvoxels/svox/model.js
// =====================================================

class Light {
  constructor(color, strength, direction, position, distance, size, detail) {
    this.color = color;
    this.strength = strength;
    this.direction = direction;
    this.position = position;
    this.distance = distance;
    this.size = size;
    this.detail = detail;
  } 
}


class Model {

  set origin(origin)  { this._origin = Planar.parse(origin); }
  get origin() { return Planar.toString(this._origin); }
  set flatten(flatten)  { this._flatten = Planar.parse(flatten); }
  get flatten() { return Planar.toString(this._flatten); }
  set clamp(clamp)  { this._clamp = Planar.parse(clamp); }
  get clamp() { return Planar.toString(this._clamp); }
  set skip(skip)  { this._skip = Planar.parse(skip); }
  get skip() { return Planar.toString(this._skip); }
  set tile(tile)  { 
    this._tile = Planar.parse(tile); 
    
    // Cleanup so only edges are named
    if (this._tile.x) this._tile = Planar.combine( this._tile, { nx:true, px:true } );
    if (this._tile.y) this._tile = Planar.combine( this._tile, { ny:true, py:true } );
    if (this._tile.z) this._tile = Planar.combine( this._tile, { nz:true, pz:true } );
    this._tile.x = false;
    this._tile.y = false;
    this._tile.z = false;
  }
  get tile() { return Planar.toString(this._tile); }
  
  set shape(shape) {
    this._shape = (shape || 'box').trim();
    if (!['box', 'sphere', 'cylinder-x', 'cylinder-y', 'cylinder-z'].includes(this._shape)) {
      throw {
        name: 'SyntaxError',
        message: `Unrecognized shape ${this._shape}. Allowed are box, sphere, cylinder-x, cylinder-y and cylinder-z`,
      };
    }
  }
  get shape() { return this._shape; }
  
  // Set AO as { color, maxDistance, strength, angle }
  setAo(ao) {
     this._ao = ao;
  }  
   
  get ao() {
    return this._ao;
  }
  
  set aoSides(sides)  { this._aoSides = Planar.parse(sides); }
  get aoSides() { return Planar.toString(this._aoSides); }
  set aoSamples(samples)  { this._aoSamples = Math.round(samples); }
  get aoSamples() { return this._aoSamples; }

  constructor() {
    this.name = 'main';
    this.lights = [];
    this.textures = {};
    this.materials = new MaterialList();
    this.voxels = new VoxelMatrix();
    this.vertices = []; 
    
    this.scale = { x:1, y:1, z:1 };
    this.rotation = { x:0, y:0, z:0 };  // In degrees
    this.position = { x:0, y:0, z:0 };   // In world scale
    this.autoResize = false;
    
    this._origin = Planar.parse('x y z');
    this._flatten = Planar.parse('');
    this._clamp = Planar.parse('');
    this._skip = Planar.parse('');
    this._tile = Planar.parse('');

    this._ao = undefined;
    this._aoSamples = 50;
    this._aoSides = Planar.parse('');

    this.shape = 'box';
    
    this.wireframe = false;
    
    this.triCount = 0;
    this.octCount = 0;
    this.octMissCount = 0;
  }
   
  _setVertex(x, y, z, vertex) {
    vertex.x = x;
    vertex.y = y;
    vertex.z = z;
    
    let matrixy = this.vertices[z + 1000000];
    if (!matrixy) {
      matrixy = [ ];
      this.vertices[z + 1000000] = matrixy;
    }
    let matrixx = matrixy[y + 1000000];
    if (!matrixx) {
      matrixx = [ ];
      matrixy[y + 1000000] = matrixx;
    }
    matrixx[x + 1000000] = vertex;
  }
  
  _getVertex(x, y, z) {
    let matrix = this.vertices[z + 1000000];
    if (matrix) {
      matrix = matrix[y + 1000000];
      if (matrix) {
        return matrix[x + 1000000];
      }
    }
    return null;
  }
  
  forEachVertex(func, thisArg) {
    for (let indexz in this.vertices) {
      let matrixy = this.vertices[indexz];
      for (let indexy in matrixy) {
        let matrixx = matrixy[indexy];
        for (let indexx in matrixx) {
          func.apply(thisArg, [ matrixx[indexx] ] );
        }
      }
    }
  }
    
  prepareForWrite() {
    this.materials.forEach(function(material) {
      
      // Reset all material bounding boxes
      material.bounds.reset();
      
      material.colors.forEach(function(color) {
        // Reset all color counts
        color.count = 0;
      }, this);
    }, this);
    
    // Add color usage count for model shell colors (to ensure the material is generated)
    if (this.shell) {
      this.shell.forEach(function (sh) {
        sh.color.count++;
      }, this);
    }
      
    // Add color usage count for material shell colors
    this.materials.forEach(function(material) {
      if (material.shell) {
        material.shell.forEach(function (sh) {
          sh.color.count++;      
        }, this);
      }
    }, this);    
    
    if (this.lights.some((light) => light.size)) {
      // There are visible lights, so the modelreader created a material and a color for them
      // Set the count to 1 to indicate it is used
      this.materials.materials[0].colors[0].count = 1;
    }
        
    this.voxels.prepareForWrite();
  }
    

  prepareForRender() {
    this.prepareForWrite();
    
    let maximumDeformCount = Deformer.maximumDeformCount(this);

    this.vertices = [];
  
    this.voxels.forEach(function createFaces(voxel) {
      let faceCount = 0;
      // Check which faces should be generated
      for (let f=0; f < SVOX._FACES.length; f++) {
        let faceName = SVOX._FACES[f];
        let neighbor = SVOX._NEIGHBORS[faceName];
        let face = this._createFace(voxel, faceName, 
                                    this.voxels.getVoxel(voxel.x+neighbor.x, voxel.y+neighbor.y, voxel.z+neighbor.z),
                                    maximumDeformCount > 0);  // Only link the vertices when needed
        if (face) {
          voxel.faces[faceName] = face;
          if (!face.skipped)
            voxel.color.count++;
          faceCount++;
        }
      }
      
      voxel.visible = faceCount > 0;
    }, this, false);
    
    this._fixClampedLinks(); 
    
    //this._logLinks();

    Deformer.changeShape(this, this._shape);
       
    Deformer.deform(this, maximumDeformCount);
    
    Deformer.warpAndScatter(this);
    
    NormalsCalculator.calculateNormals(this);
        
    VerticesTransformer.transformVertices(this);    
    
    LightsCalculator.calculateLights(this);
    
    AOCalculator.calculateAmbientOcclusion(this);
    
    ColorCombiner.combineColors(this);

    UVAssigner.assignUVs(this);
    
    Simplifier.simplify(this);
    
    FaceAligner.alignFaceDiagonals(this);
  }
  
  _logLinks() {
    this.voxels.forEach(function(voxel) {      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped)
          continue;
        
        let log = `VOXEL (${voxel.x},${voxel.y},${voxel.z}):${faceName}\r\n`;
        for (let v = 0; v < 4; v++) {
          let vertex = face.vertices[v];
          vertex.fullyClamped = vertex.fullyClamped || (vertex.nrOfClampedLinks === vertex.links.length);
          log += `    VERTEX (${vertex.x},${vertex.y},${vertex.z}):${vertex.fullyClampes?"fully":""} :`;
          for (let l = 0; l < vertex.links.length; l++) {
            let link = vertex.links[l];
            log += `(${link.x},${link.y},${link.z}) `;          
          }
          log += `\r\n`;
        }
        
        console.log(log);
      }
    }, this);
  }

  _fixClampedLinks() {
    let _this = this;
    
    // Clamped sides are ignored when deforming so the clamped side does not pull in the other sodes.
    // This results in the other sides ending up nice and peripendicular to the clamped sides.
    // However, this als makes all of the vertices of the clamped side not deform.
    // This then results in the corners of these sides sticking out sharply with high deform counts.
    
    // Find all vertices that are fully clamped (i.e. not at the edge of the clamped side)
    this.voxels.forEach(function(voxel) {
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (!face.clamped)
          continue;

        for (let v = 0; v < 4; v++) {
          let vertex = face.vertices[v];
          vertex.fullyClamped = vertex.fullyClamped || (vertex.nrOfClampedLinks === vertex.links.length);
          if (vertex.fullyClamped)
            vertex.links = [];
        }
 
      }        
    });

    // For these fully clamped vertices add links for normal deforming
    this.voxels.forEach(function(voxel) {
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (!face.clamped) 
          continue;
        
        for (let v = 0; v < 4; v++) {
          let vertexFrom = face.vertices[v];
          let vertexTo = face.vertices[(v+1) % 4];

          if (vertexFrom.fullyClamped && vertexFrom.links.indexOf(vertexTo) === -1) {
            vertexFrom.links.push(vertexTo);
          }
          if (vertexTo.fullyClamped && vertexTo.links.indexOf(vertexFrom) === -1) {
            vertexTo.links.push(vertexFrom);
          }
        }
      }
    });
  }  
    
  _determineBounds() {
    // Auto resize, so determine the actual model size
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    // Skip the skipped faces when determining the bounds
    this.voxels.forEach(function(voxel) {
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (!face.skipped) {
          for (let v = 0; v < 4; v++) {
            let vertex = face.vertices[v];
            if (vertex.x<minX) minX = vertex.x;
            if (vertex.y<minY) minY = vertex.y;
            if (vertex.z<minZ) minZ = vertex.z;
            if (vertex.x>maxX) maxX = vertex.x;
            if (vertex.y>maxY) maxY = vertex.y;
            if (vertex.z>maxZ) maxZ = vertex.z;
          }
        }
      }
    });

    let offsetX = -(minX + maxX)/2;
    let offsetY = -(minY + maxY)/2;
    let offsetZ = -(minZ + maxZ)/2;

    if (this._origin.nx) offsetX = -minX;
    if (this._origin.px) offsetX = -maxX;
    if (this._origin.ny) offsetY = -minY;
    if (this._origin.py) offsetY = -maxY;
    if (this._origin.nz) offsetZ = -minZ;
    if (this._origin.pz) offsetZ = -maxZ;

    let scaleX = (this.voxels.maxX-this.voxels.minX+1)/(maxX-minX);
    let scaleY = (this.voxels.maxY-this.voxels.minY+1)/(maxY-minY);
    let scaleZ = (this.voxels.maxZ-this.voxels.minZ+1)/(maxZ-minZ);

    if (this.autoResize)
      scaleX = scaleY = scaleZ = Math.min(scaleX, scaleY, scaleZ);
    else
      scaleX = scaleY = scaleZ = 1;

    return { bounds : { minX, minY, minZ, maxX, maxY, maxZ },
             offset : { x: offsetX, y:offsetY, z:offsetZ },
             scale  : { x: scaleX,  y:scaleY,  z:scaleZ  }
           };
  }  
  
  _lookAtVertices(vx, vy, vz, dx, dy, dz, ux, uy, uz) {
    
    // Define the transformation in reverse order to how they are carried out
    let vertexTransform = Matrix.lookAt(vx, vy, vz, dx, dy, dz, ux, uy, uz); 
    
    // Now move all vertices to their new position
    this.forEachVertex(function(vertex) {      
      vertexTransform.transformPoint(vertex)
    }, this); 
        
    // Convert the vertex transform matrix in a normal transform matrix 
    let normalTransform = Matrix.inverse(vertexTransform);
    normalTransform = Matrix.transpose(normalTransform);
    
    // Transform all normals
    this.voxels.forEach(function transformNormals(voxel) {
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        for (let n = 0; n<face.normals.length; n++) {
          if (!face.normals[n].transformed) {
            normalTransform.transformVector(face.normals[n]);
            face.normals[n].transformed = true;
          }
        }
      }
    }, this);
  }
  
  _createFace(voxel, faceName, neighbor, linkVertices) {
    
    if (!voxel || !voxel.material || voxel.material.opacity === 0) {
      // No voxel, so no face
      return null;
    }
    else if (!neighbor || !neighbor.material) {
      // The voxel is next to an empty voxel, so create a face
    }
    else if (!neighbor.material.isTransparent && !neighbor.material.wireframe) {
      // The neighbor is not see through, so skip this face
      return null;
    }
    else if (!voxel.material.isTransparent && !voxel.material.wireframe) {
      // The voxel is not see through, but the neighbor is, so create the face 
    }
    else if (voxel.material.isTransparent && !voxel.material.wireframe && neighbor.material.wireframe) {
       // The voxel is transparent and the neighbor is wireframe, create the face 
    }
    else
      return null;
    
    let flattened = this._isFacePlanar(voxel, faceName, voxel.material._flatten, this._flatten);
    let clamped   = this._isFacePlanar(voxel, faceName, voxel.material._clamp, this._clamp);
    let skipped   = this._isFacePlanar(voxel, faceName, voxel.material._skip, this._skip);

    let face = {
      
      vertices: [
        this._createVertex(voxel, faceName, 0, flattened, clamped),
        this._createVertex(voxel, faceName, 1, flattened, clamped),
        this._createVertex(voxel, faceName, 2, flattened, clamped),
        this._createVertex(voxel, faceName, 3, flattened, clamped)
      ],
      
      ao: [0, 0, 0, 0],
        
      uv: [null, null, null, null],  // When used will have {u,v} items
            
      flattened,
      clamped,
      skipped,
    };
  
     // Link the vertices for deformation
    if (linkVertices)
      this._linkVertices(voxel, face, faceName);
    
    return face;
  }
  
  _createVertex(voxel, faceName, vi, flattened, clamped) {
    // Calculate the actual vertex coordinates
    let vertexOffset = SVOX._VERTICES[faceName][vi];
    let x = voxel.x + vertexOffset.x;
    let y = voxel.y + vertexOffset.y;
    let z = voxel.z + vertexOffset.z;
    
    // Retrieve the material of the voxel to set the different material properties for the vertex
    let material = voxel.material;
    
    let flatten = { x:false, y:false, z:false };
    let clamp   = { x:false, y:false, z:false };
    flatten[faceName[1]] = flattened;
    clamp[faceName[1]] = clamped;

    // Create the vertex if it does not yet exist
    let vertex = this._getVertex(x, y, z);
    if (!vertex) {
      vertex = { x: x, y: y, z: z,
                 links: [ ],
                 nrOfClampedLinks: 0,
                 colors: [ voxel.color ],
                 newPos: { x: 0, y:0, z: 0, set: false },
                 deform: material.deform,
                 warp: material.warp,
                 scatter: material.scatter,
                 flatten: flatten,
                 clamp: clamp,
                 count:1
               };
      this._setVertex(x, y, z, vertex);
    }
    else {
      
      vertex.colors.push(voxel.color);
      
      vertex.flatten.x = vertex.flatten.x || flatten.x;
      vertex.flatten.y = vertex.flatten.y || flatten.y;
      vertex.flatten.z = vertex.flatten.z || flatten.z;
      vertex.clamp.x   = vertex.clamp.x   || clamp.x;
      vertex.clamp.y   = vertex.clamp.y   || clamp.y;
      vertex.clamp.z   = vertex.clamp.z   || clamp.z;
      
      // Favour less deformation over more deformation
      if (!material.deform)
        vertex.deform = null;
      else if (vertex.deform &&
               (this._getDeformIntegral(material.deform) < this._getDeformIntegral(vertex.deform))) {
        vertex.deform = material.deform;
      }

      // Favour less / less requent warp over more warp
      if (!material.warp)
        vertex.warp = null;
      else if (vertex.warp &&
               ((material.warp.amplitude < vertex.warp.amplitude) ||
                (material.warp.amplitude === vertex.warp.amplitude && material.warp.frequency > vertex.warp.frequency))) {
        vertex.warp = material.warp;
      }

      // Favour less scatter over more scatter
      if (!material.scatter)
        vertex.scatter = null;
      else if (vertex.scatter &&
               Math.abs(material.scatter) < Math.abs(vertex.scatter)) {
        vertex.scatter = material.scatter;
      }
    }

    return vertex; 
  }
  
  _getDeformIntegral(deform) {
    // Returns the total amount of deforming done by caluclating the integral
    return (deform.damping === 1)
       ? deform.strength*(deform.count + 1)
       : (deform.strength*(1-Math.pow(deform.damping,deform.count+1)))/(1-deform.damping);
  }
  
  _isFacePlanar(voxel, faceName, materialPlanar, modelPlanar) {
    let material = voxel.material;
    switch(faceName) {
      case 'nx' : return materialPlanar.x || modelPlanar.x || (materialPlanar.nx && voxel.x === material.bounds.minX) || (modelPlanar.nx && voxel.x === this.voxels.minX);
      case 'px' : return materialPlanar.x || modelPlanar.x || (materialPlanar.px && voxel.x === material.bounds.maxX) || (modelPlanar.px && voxel.x === this.voxels.maxX);
      case 'ny' : return materialPlanar.y || modelPlanar.y || (materialPlanar.ny && voxel.y === material.bounds.minY) || (modelPlanar.ny && voxel.y === this.voxels.minY);
      case 'py' : return materialPlanar.y || modelPlanar.y || (materialPlanar.py && voxel.y === material.bounds.maxY) || (modelPlanar.py && voxel.y === this.voxels.maxY);
      case 'nz' : return materialPlanar.z || modelPlanar.z || (materialPlanar.nz && voxel.z === material.bounds.minZ) || (modelPlanar.nz && voxel.z === this.voxels.minZ);
      case 'pz' : return materialPlanar.z || modelPlanar.z || (materialPlanar.pz && voxel.z === material.bounds.maxZ) || (modelPlanar.pz && voxel.z === this.voxels.maxZ);
      default: return false;
    }
  }
    
  _linkVertices(voxel, face, faceName) {
    if (face.clamped) {
      // Do not link clamped face vertices so the do not pull in the sides on deform.
      // But now this leaves these vertices with only 3 links, which offsets the average.
      // Add the vertex itself to compensate the average.
      // This, for instance, results in straight 45 degree roofs when clamping the sides.
      // This is the only difference in handling flatten vs clamp.
      for (let v = 0; v < 4; v++) {
        let vertex = face.vertices[v];
        if (vertex.links.indexOf(vertex) === -1) {
          vertex.links.push(vertex);
          vertex.nrOfClampedLinks++;
        }
      }
    }
    else {
      // Link each vertex with its neighbor and back (so not diagonally)
      for (let v = 0; v < 4; v++) {
        let vertexFrom = face.vertices[v];
        let vertexTo = face.vertices[(v+1) % 4];
        
        if (vertexFrom.links.indexOf(vertexTo) === -1)
          vertexFrom.links.push(vertexTo);
        if (vertexTo.links.indexOf(vertexFrom) === -1)
          vertexTo.links.push(vertexFrom);
      }
    }  
  }
  
  _normalize(vector) {
    if (vector) {
      let length = Math.sqrt( vector.x * vector.x + vector.y * vector. y + vector.z * vector.z );
      if (length > 0) {
        vector.x /= length;
        vector.y /= length;
        vector.z /= length;
      }
    }
    return vector;
  }
  
  _isZero(vector) {
    return !vector || (vector.x === 0 && vector.y === 0 && vector.z === 0);
  }
  
  // End of class Model
}

// =====================================================
// /smoothvoxels/svox/modelreader.js
// =====================================================

class ModelReader {

    /**
     * Read the model from a string.
     * @param {any} modelString The string containing the model.
     * @returns {Model} The model.
     */
    static readFromString(modelString) {

        let modelData = this._parse(modelString);
        this._validateModel(modelData);

        let model = this._createModel(modelData);

        return model;
    }

    /**
     * Parse the model string into a modelData object which can be converted into a model
     * @param {string} modelString The string to be parsed
     * @returns {object} A simple object with the model data (not yet the actual model).
     */
    static _parse(modelString) {
        const regex = {
            linecontinuation: new RegExp(/_\s*[\r\n]/gm),
            modelparts: new RegExp(
                          /\s*(\/\/(.*?)\r?\n)/.source + '|' +                             // Comments
                          /\s*(texture|light|model|material|voxels)\s+/.source + '|' +     // SVOX Blocks
                          /\s*([^=,\r\n]+=\s*data:image.*?base64,.*$)\s*/.source + '|' +   // Name = data:image/...;base64,iVBORw...
                          /\s*([^=,\r\n]+=[^\r\n=;,\/]+)\s*/.source + '|' +                // Name = Value
                          /\s*([A-Za-z \(\)\d -]+)\s*/.source,                             // Voxel matrix
                          "gm")
        };
        
        let modelData = { lights:[], textures:[], materials:[] };
        let parent = modelData;
        let voxelString = null;

        // Split the lines so every line contains:
        // - A block name (i.e. "texture"/"light"/"model"/"material"/"voxels")
        // - name = value (e.g. "emissive = #FFF 1")
        // - A line from the voxel matrix
        // while removing all comments
        let lines = Array.from(modelString.replaceAll(regex.linecontinuation,' ').matchAll(regex.modelparts), m => m[0].trim());
      
        // Now convert the lines to a javascript object
        lines.filter(l => l).forEach(function (line) {
            
          if (line.startsWith('//')) {
              // Skip comments
          }
          else if (line === 'texture') {
              // New texture start
              parent = { id:'<no-name>', cube:false };
              modelData.textures.push(parent);
          }
          else if (line === 'light') {
              // New light start
              parent = { color:'#FFF' };
              modelData.lights.push(parent);
          }
          else if (line === 'model') {
            // Model settings
            parent = modelData;
          } 
          else if (line === 'material') {
              // New material start
              parent = {};
              modelData.materials.push(parent);
          }
          else if (line === 'voxels') {
              // Voxels belong to the model
              parent = modelData; 
              voxelString = "";
          } 
          else if (voxelString !== null) {
              // We are in the voxel matrix, so just add the line to the voxel string
              voxelString += line.replace(/\s/g, '');
          } 
          else {
            // Handle one property assignment 
            let equalIndex = line.indexOf('=');
            if (equalIndex === -1) {
                throw {
                    name: 'SyntaxError',
                    message: `Invalid definition '${line}'.`
                };
            }
            
            // Don't use split because image data contains '='
            let name  = line.substring(0, equalIndex).trim().toLowerCase();
            let value = line.substring(equalIndex+1).trim();
            
            // Set the property
            parent[name] = value;
          }
        }, this);

        modelData.voxels = voxelString;
      
        return modelData;
    }

    /**
     * Create the actual model from the parsed model data.
     * @param {object} modelData The simple object from the parsed model string.
     * @returns {Model} The model class with its properties, materials and voxels.
     */
    static _createModel(modelData) {
        let model = new Model();
    
        model.size = this._parseXYZInt('size', modelData.size, null, true);
        model.scale = this._parseXYZFloat('scale', modelData.scale, '1', true);
        model.rotation = this._parseXYZFloat('rotation', modelData.rotation, '0 0 0', false);
        model.position = this._parseXYZFloat('position', modelData.position, '0 0 0', false);
        model.autoResize = modelData.autoresize === "true" || false;

        model.shape = modelData.shape;

        // Set the global wireframe override
        model.wireframe = modelData.wireframe === "true" || false;

        // Set the planar values
        model.origin = modelData.origin;
        model.flatten = modelData.flatten;
        model.clamp = modelData.clamp;
        model.skip = modelData.skip;
        model.tile = modelData.tile;
      
        model.setAo(this._parseAo(modelData.ao));
        model.aoSides = modelData.aosides;
        model.aoSamples = parseInt(modelData.aosamples || 50, 10);
      
        model.shell = this._parseShell(modelData.shell);
      
        if (modelData.lights.some((light) => light.size)) {
          // There are visible lights, so create a basic material for them
          let lightMaterial = model.materials.createMaterial(SVOX.MATBASIC, SVOX.FLAT, 1, 0, 
                                                             false, 1, 0, false, false, SVOX.FRONT, 
                                                             '#FFF', 0, false, 
                                                             null, null, null, null, null, null, 
                                                             -1, -1, 0, 0, 0, 0);
          lightMaterial.addColorHEX('#FFFFFF');      
        }
                     

        modelData.lights.forEach(function (lightData) {
            this._createLight(model, lightData);
        }, this);
      
        modelData.textures.forEach(function (textureData) {
            this._createTexture(model, textureData);
        }, this);
         
        modelData.materials.forEach(function (materialData) {
            this._createMaterial(model, materialData);
        }, this);
      
        // Retrieve all colors and Id's from all materials
        model.colors = {};
        model.materials.forEach(function (material) {
            material.colors.forEach(function (color) {
                model.colors[color.id] = color;
            });
        });
      
        // Find the color (& material) for the shell(s)
        this._resolveShellColors(model.shell, model);
        model.materials.forEach(function (material) {
          this._resolveShellColors(material.shell, model);
        }, this);

        // Create all voxels
        this._createVoxels(model, modelData.voxels);

        return model;
    }

    /**
     * Create one light from its parsed data
     * @param {object} lightData The simple object from the parsed model string.
     */
    static _createLight(model, lightData) {
        if (!lightData.color) {
          lightData.color = "#FFF 1";
        }
        if (!lightData.color.startsWith('#')) {
            lightData.color = "#FFF " + lightData.color;
        }  
        lightData.strength  = parseFloat(lightData.color.split(' ')[1] || 1.0);  
        lightData.color     = Color.fromHex(lightData.color.split(' ')[0]);
        lightData.direction = this._parseXYZFloat('direction', lightData.direction, null, false);
        lightData.position  = this._parseXYZFloat('position', lightData.position, null, false);
        lightData.distance  = parseFloat(lightData.distance || 0);
        lightData.size      = Math.max(0, parseFloat(lightData.size || 0.0));
        lightData.detail    = Math.min(3, Math.max(0, parseInt(lightData.detail || 1, 10)));
        let light = new Light(lightData.color, lightData.strength,
                              lightData.direction, lightData.position, lightData.distance,
                              lightData.size, lightData.detail);
      
        model.lights.push(light);
    }
  
    /**
     * Create one texture from its parsed data
     * @param {object} textureData The simple object from the parsed model string.
     */
    static _createTexture(model, textureData) {
        textureData.cube = textureData.cube === "true" || false;
        model.textures[textureData.id] = textureData;      
    }

    /**
     * Create one material from its parsed data
     * @param {object} materialData The simple object from the parsed model string.
     */
    static _createMaterial(model, materialData) {
      
        // Cleanup data
        let lighting = SVOX.FLAT;
        if (materialData.lighting === SVOX.SMOOTH) lighting = SVOX.SMOOTH;
        if (materialData.lighting === SVOX.BOTH) lighting = SVOX.BOTH;
      
        if (!materialData.emissive) {
          if (materialData.emissivemap)
            materialData.emissive = "#FFF 1";
          else
            materialData.emissive = "#000 0";
        }
        if (!materialData.emissive.startsWith('#')) {
            materialData.emissive = "#FFF " + materialData.emissive;
        }
        materialData.emissiveColor     = materialData.emissive.split(' ')[0];
        materialData.emissiveIntensity = materialData.emissive.split(' ')[1] || 1.0;
      
        if (materialData.ao && !materialData.ao.startsWith('#')) {
            materialData.ao = "#000 " + materialData.ao;
        }
        materialData.maptransform = materialData.maptransform || '';

        // Create the material with all base attributes to recongnize reusable materials
        let material =  model.materials.createMaterial(
          materialData.type || SVOX.MATSTANDARD, 
          lighting, 
          parseFloat(materialData.roughness || (materialData.roughnessmap ? 1.0 : 1.0)), 
          parseFloat(materialData.metalness || (materialData.metalnessmap ? 1.0 : 0.0)), 
          materialData.fade === "true" || false, 
          parseFloat(materialData.opacity || 1.0), 
          parseFloat(materialData.alphatest || 0), 
          materialData.transparent === "true" || false,
          materialData.wireframe === "true" || false, 
          materialData.side, 
          materialData.emissiveColor,
          materialData.emissiveIntensity,
          materialData.fog === "false" ? false : true, 
          materialData.map ? model.textures[materialData.map] : null,
          materialData.normalmap ? model.textures[materialData.normalmap] : null,
          materialData.roughnessmap ? model.textures[materialData.roughnessmap] : null,
          materialData.metalnessmap ? model.textures[materialData.metalnessmap] : null,
          materialData.emissivemap ? model.textures[materialData.emissivemap] : null,
          materialData.matcap ? model.textures[materialData.matcap] : null,
          parseFloat(materialData.maptransform.split(' ')[0] || -1.0),    // uscale (in voxels,  -1 = cover model)
          parseFloat(materialData.maptransform.split(' ')[1] || -1.0),    // vscale (in voxels,  -1 = cover model)
          parseFloat(materialData.maptransform.split(' ')[2] || 0.0),     // uoffset
          parseFloat(materialData.maptransform.split(' ')[3] || 0.0),     // voffset
          parseFloat(materialData.maptransform.split(' ')[4] || 0.0)      // rotation in degrees
        ); 
      
        if (materialData.deform) {
            // Parse deform count, strength and damping
            material.setDeform(parseFloat(materialData.deform.split(' ')[0]),          // Count
                               parseFloat(materialData.deform.split(' ')[1] || 1.0),   // Strength
                               parseFloat(materialData.deform.split(' ')[2] || 1.0));  // Damping
        }

        if (materialData.warp) {
            // Parse amplitude and frequency
            material.setWarp(parseFloat(materialData.warp.split(' ')[0]),
                             parseFloat(materialData.warp.split(' ')[1] || 1.0));
        }

        if (materialData.scatter)
            material.scatter = parseFloat(materialData.scatter);
      
        // Set the planar values
        material.flatten = materialData.flatten;
        material.clamp = materialData.clamp;
        material.skip = materialData.skip;
                                  
        material.setAo(this._parseAo(materialData.ao));
        material.shell = this._parseShell(materialData.shell);

        // Set whether lights affect this material
        material.lights = materialData.lights === "false" ? false : true; 

        // Cleanup the colors string (remove all extra spaces)
        const CLEANCOLORID = /\s*\(\s*(\d+)\s*\)\s*/g;
        const CLEANDEFINITION = /([A-Z][a-z]*)\s*(\(\d+\))?[:]\s*(#[a-fA-F0-9]*)\s*/g; 
        materialData.colors = materialData.colors.replace(CLEANCOLORID, '($1)');
        materialData.colors = materialData.colors.replace(CLEANDEFINITION, '$1$2:$3 ')
        
        let colors = materialData.colors.split(' ').filter(x => x);
      
        colors.forEach(function (colorData) {
            let colorId = colorData.split(':')[0];
            let colorExId = null;
            if (colorId.includes('(')) {
              colorExId = Number(colorId.split('(')[1].replace(')',''));
              colorId = colorId.split('(')[0];
            }
            let color = colorData.split(':')[1];
            if (!material.colors[colorId]) {
                color = material.addColor(Color.fromHex(color));
                if (!/^[A-Z][a-z]*$/.test(colorId)) {
                  throw {
                    name: 'SyntaxError',
                    message: `Invalid color ID '${colorId}'.`
                  };
                }
                color.id   = colorId;
                color.exId = colorExId; 
            }
        }, this);
    }

    /**
     * Creates all voxels in the model from the (RLE) Voxel Matrix
     * @param {Model} model The model in which the voxels will be set
     * @param {string} voxels The (RLE) voxel string
     */
    static _createVoxels(model, voxels) {
        let colors = model.colors;
        let errorMaterial = null; 
        
        // Split the voxel string in numbers, (repeated) single letters or _ , Longer color Id's or ( and ) 
        let chunks = [];
        if (voxels.matchAll)
          chunks = voxels.matchAll(/[0-9]+|[A-Z][a-z]*|-+|[()]/g);
        else {
          // In case this browser does not support matchAll, DIY match all
          let regex = RegExp('[0-9]+|[A-Z][a-z]*|-+|[()]', 'g');
          let chunk;
          while ((chunk = regex.exec(voxels)) !== null) {
            console.log(chunk);
            chunks.push(chunk);
          }
          chunks = chunks[Symbol.iterator]();
        }
          
        let rleArray = this._unpackRle(chunks);

        // Check the voxel matrix size against the specified size
        let totalSize = model.size.x * model.size.y * model.size.z;
        let voxelLength = 0;
        for (let i = 0; i < rleArray.length; i++) {
            voxelLength += rleArray[i][1];
        }
        if (voxelLength !== totalSize) {
            throw {
                name: 'SyntaxError',
                message: `The specified size is ${model.size.x} x ${model.size.y} x ${model.size.z} (= ${totalSize} voxels) but the voxel matrix contains ${voxelLength} voxels.`
            };
        }

        // Prepare the voxel creation context      
        let context = {
            minx: 0,
            miny: 0,
            minz: 0,
            maxx: model.size.x - 1,
            maxy: model.size.y - 1,
            maxz: model.size.z - 1,
            x: 0,
            y: 0,
            z: 0
        };

        // Create all chunks, using the context as cursor
        for (let i = 0; i < rleArray.length; i++) {
            let color = null;
            if (rleArray[i][0] !== '-') {
                color = colors[rleArray[i][0]];
                if (!color) {
                  // Oops, this is not a known color, create a purple 'error' color
                  if (errorMaterial === null)
                    errorMaterial = model.materials.createMaterial(SVOX.MATSTANDARD, SVOX.FLAT, 0.5, 0.0, false, 1.0, false);
                  color = Color.fromHex('#FF00FF');
                  color.id = rleArray[i][0];
                  errorMaterial.addColor(color);
                  colors[rleArray[i][0]] = color;
                }
            }

            this._setVoxels(model, color, rleArray[i][1], context);
        }
    }
  
    /**
     * Parses a 'color distance strength angle' string to an ao object
     * @param {string} aoData The ao data, or undefined
     * returns {object} { color, maxDistance, strength, angle } or undefined
     */
    static _parseAo(oaData) {
      let ao = undefined;
      if (oaData) {

        if (!oaData.startsWith('#')) { 
            // Default to black color
            oaData = "#000 " + oaData;
        }

        let color = Color.fromHex(oaData.split(' ')[0]);
        let maxDistance = Math.abs(parseFloat(oaData.split(' ')[1] || 1.0));
        let strength = parseFloat(oaData.split(' ')[2] || 1.0);
        let angle = parseFloat(oaData.split(' ')[3] || 70.0);
        angle = Math.max(0, Math.min(90, Math.round(angle)));

        ao = { color, maxDistance, strength, angle };
      }
      return ao;
    }
  
      /**
     * Parses a 'colorId distance'+ string to a shell object, e.g. "P 0.25 Q 0.5"
     * @param {string} shellData The shell data, or undefined
     * returns {array} [ { colorID, distance }, ... ] or undefined
     * NOTE: Since the color may be defined in a material which is parsed later, 
     *       we'll resolve the colorID later to aad the color.
     */
    static _parseShell(shellData) {
      let shell = undefined;
      let error = false;
      if (shellData) {
        shell = [];
        if (shellData !== 'none') {
          let parts = shellData.split(/\s+/);
          if (parts.length < 2 || parts.length % 2 !== 0) { 
            error = true;
          }
          else {
            for (let s = 0; s < parts.length/2; s++) {
              let colorId  = parts[s*2 + 0];
              let distance = parts[s*2 + 1];
              if (!/^[A-Z][a-z]*$/.test(colorId) || !/^([-+]?[0-9]*\.?[0-9]+)*$/.test(distance)) {
                error = true;
                break;
              }
              else
                shell.push( { colorId:parts[s*2], distance:parts[s*2+1] } );
            }
          }
        }
      }
      
      if (error) {
        throw {
          name: 'SyntaxError',
          message: `shell '${shellData}' must be 'none' or one or more color ID's and distances, e.g. P 0.2 Q 0.4`
        };        
      }
      else if (shell) {
        shell = shell.sort(function(a,b) {
          return a.distance - b.distance;
        });
      }
        
      
      return shell;
    }
  
    /**
     * Resolves the color ID of shell to a specific material
     * @param {object} shell The shell array containing objects with containing colorId and distance
     * @param {object} model The shell object containing colorId and distance
     */
    static _resolveShellColors(shell, model) {
      if (!shell || shell.length === 0)
        return;
      
      shell.forEach(function (sh) {
        sh.color = model.colors[sh.colorId];
        if (!sh.color) {
          throw {
            name: 'SyntaxError',
            message: `shell color ID '${sh.colorId}' not found in one of the materials.`
          };           
        }
      }, this);
    }
  
    /**
     * Parses an 'x y z' string into an object with integer x y z values
     * @param {string} name The name of the field
     * @param {string} value The string value of the field
     * @param {string} defaultValue The default value for an optional field
     * @param {boolean} allowUniform When true one value is allowed to fill x, y and z
     * @returns {object} An { x, y, z } object with integers 
     */
    static _parseXYZInt(name, value, defaultValue, allowUniform) {
      let xyz = this._parseXYZFloat(name, value, defaultValue, allowUniform);
      return {
        x: Math.trunc(xyz.x),  
        y: Math.trunc(xyz.y),  
        z: Math.trunc(xyz.z)  
      };
    }
  
    /**
     * Parses an 'x y z' string into an object with float x y z values
     * @param {string} name The name of the field
     * @param {string} value The string value of the field
     * @param {string} defaultValue The default value for an optional field
     * @param {boolean} allowUniform When true one value is allowed to fill x, y and z
     * @returns {object} An { x, y, z } object with floats 
     */
    static _parseXYZFloat(name, value, defaultValue, allowUniform) {
      if (!value && defaultValue) 
        value = defaultValue;
      
      if (!value) {
        return null;
      }
        
      let xyz = value.split(/[\s/]+/);
      if (xyz.length === 1 && allowUniform) {
        xyz.push(xyz[0]);  
        xyz.push(xyz[0]);  
      }

      if (xyz.length !== 3) {
        throw {
          name: 'SyntaxError',
          message: `'${name}' must have three values.`
        };
      }
        
      xyz = { 
          x: parseFloat(xyz[0]), 
          y: parseFloat(xyz[1]), 
          z: parseFloat(xyz[2])
      };
      
      if (Number.isNaN(xyz.x) || Number.isNaN(xyz.y) || Number.isNaN(xyz.z)) {
        throw {
          name: 'SyntaxError',
          message: `Invalid value '${value}' for ${name}'.`
        };
      }
      
      return xyz;
    }

    /**
     * Converts the Recursively Run Length Encoded chunks into simple RLE chunks.
     * @param {[][]} chunks An array or RLE chunks (containing Color ID and count or sub chunks and count)
     * @returns {[][]} An array of simple RLE chunks containing arrays with Color ID's and counts.
     */
    static _unpackRle(chunks) {
        let result = [];
        let count = 1;
        let chunk = chunks.next();
        while (!chunk.done) {
            let value = chunk.value[0];
            if (value[0] >= '0' && value[0] <= '9') {
                count = parseInt(value, 10);
            }
            else if (value === '(') {
                // Convert the chunk to normal RLE and add it to the result (repeatedly)
                let sub = this._unpackRle(chunks);
                for (let c = 0; c < count; c++)
                    Array.prototype.push.apply(result, sub);
                count = 1;
            }
            else if (value === ')') {
                return result;
            }
            else if (value.length > 1 && value[0] >= 'A' && value[0] <= 'Z' && value[1] === value[0]) {
                if (count > 1) {
                  result.push([value[0], count]);
                  result.push([value[0], value.length -1]);
                }
                else {
                  result.push([value[0], value.length]);
                }
                count = 1;
            }
            else if (value.length > 1 && value[0] === '-' && value[1] === '-') {
                if (count > 1) {
                  result.push(['-', count]);
                  result.push(['-', value.length -1]);
                }
                else {
                  result.push(['-', value.length]);
                }
                count = 1;
            }
            else {
                result.push([value, count]);
                count = 1;
            }
            chunk = chunks.next();
        }

        return result;
    }

    /**
     * Add one or more voxel of the same color to the model in the standard running order (x, y then z).
     * Each invocation automatically advances to the next voxel. 
     * @param {Model} model The model to which to add the voxel.
     * @param {Color} color The color to set for this voxel, or null for an empty voxel.
     * @param {int} count The number of voxels to set. 
     * @param {object} context The context which holds the current 'cursor' in the voxel array.
     */
    static _setVoxels(model, color, count, context) {
        let SIZE = 3;
        while (count-- > 0) {
            if (color) 
              model.voxels.setVoxel(context.x, context.y, context.z, new Voxel(color));
            context.x++;
            if (context.x > context.maxx) {
                context.x = context.minx;
                context.y++;
            }
            if (context.y > context.maxy) {
                context.y = context.miny;
                context.z++;
            }
        }
    }

    /**
     * Check whether properties are missing or unrecognized from the model data.
     * @param {object} modelData The simple object from the parsed model string.
     */
    static _validateModel(modelData) {
        let mandatory = ['size', 'materials', 'textures', 'lights', 'voxels'];
        let optional =  ['name', 'shape', 'scale', 'rotation', 'position', 'origin', 'autoresize',
                         'flatten', 'clamp', 'skip', 'tile', 'ao', 'aosides', 'aosamples', 'shell', 'wireframe' ];
        this._validateProperties(modelData, mandatory, optional, 'model');

        modelData.lights.forEach(function (lightData) {
            this._validateLight(lightData);
        }, this);

        modelData.textures.forEach(function (textureData) {
            this._validateTexture(textureData);
        }, this);

        modelData.materials.forEach(function (materialData) {
            this._validateMaterial(materialData);
        }, this);
    }
  
    /**
     * Check whether properties are missing or unrecognized from the light data.
     * @param {object} lightData The simple object from the parsed model string.
     */
    static _validateLight(lightData) {
        let mandatory = ['color'];
        let optional =  ['direction', 'position', 'distance', 'size', 'detail'];
        this._validateProperties(lightData, mandatory, optional, 'light');
      
        // Extra checks
        if (lightData.direction && lightData.position) {
          throw {
            name: 'SyntaxError',
            message: `A light cannot have a 'position' as well as a 'direction'.`
          };        
        }
        if (lightData.direction && lightData.distance) {
          throw {
            name: 'SyntaxError',
            message: `A directional light cannot have a 'distance'.`
          };        
        }
        if (!lightData.position && (lightData.size || lightData.detail)) {
          throw {
            name: 'SyntaxError',
            message: `Only positional lights can have size and detail.`
          };        
        }
    }

    /**
     * Check whether properties are missing or unrecognized from the texture data.
     * @param {object} textureData The simple object from the parsed model string.
     */
    static _validateTexture(textureData) {
        let mandatory = ['id', 'image'];
        let optional =  ['cube'];
        this._validateProperties(textureData, mandatory, optional, 'texture');
    }

    /**
     * Check whether properties are missing or unrecognized from the material data.
     * @param {object} materialData The simple object from the parsed model string.
     */
    static _validateMaterial(materialData) {
        let mandatory = ['colors'];
        let optional =  ['type', 'lighting', 'fade', 'roughness', 'metalness', 'emissive', 'fog', 'opacity', 'alphatest', 'transparent',
                         'deform', 'warp', 'scatter', 'flatten', 'clamp', 'skip', 'ao', 'lights', 'wireframe', 'side', 'shell',
                         'map', 'normalmap', 'roughnessmap', 'metalnessmap', 'emissivemap', 'matcap', 'maptransform'];
        this._validateProperties(materialData, mandatory, optional, 'material');
    }

     /**
     * Ensure mandatory properties are present and no unknown properties.
     * @param {object} data The simple object from the parsed model string.
     * @param {string[]} mandatory An array of allowed mandatory property names.
     * @param {string[]} optional An array of allowed optional property names.
     * @param {string} objectName The name of the object being checked.
     */
    static _validateProperties(data, mandatory, optional, objectName) {

        // Ensure all mandatory properties are present
        for (let propertyName of mandatory) {
            if (!data[propertyName]) {
                throw {
                    name: 'SyntaxError',
                    message: `Mandatory property '${propertyName}' not set in ${objectName}.`
                };
            }
        }

        // Ensure no unknown properties are present
        for (let propertyName in data) {
            if (!mandatory.includes(propertyName) && !optional.includes(propertyName)) {
                throw {
                    name: 'SyntaxError',
                    message: `Unknown property '${propertyName}' found in ${objectName}.`
                };
            }
        }
    }
}

// =====================================================
// /smoothvoxels/svox/modelwriter.js
// =====================================================

class ModelWriter {

  /**
   * Serialize the model to a string. 
   * When repeat is used, compressed is ignored.
   * @param model The model data.
   * @param compressed Wether the voxels need to be compressed using Recursive Runlength Encoding.
   * @param repeat An integer specifying whether to repeat the voxels to double or tripple the size, default is 1. 
   */
  static writeToString(model, compressed, repeat) {
    repeat = Math.round(repeat || 1);
    
    // Prepare the model (count colors, recalculate bounding box, etc.)
    model.prepareForWrite();

    // Retrieve all colors
    let missingColorIds = false;
    let colors = [];
    model.materials.forEach(function(material) {
      material.colors.forEach(function(color) {
        //if (color.count > 0)
          colors.push(color);
          if (!color.id)
            missingColorIds = true;
      });
    });

    if (missingColorIds) {
      // Sort the colors on (usage) count
      colors.sort(function (a, b) {
        return b.count - a.count;
      });

      // Give the colors their Id
      for (let index = 0; index < colors.length; index++)
        colors[index].id = this._colorIdForIndex(index); 
    }
    
    // Add the textures to the result
    let result = this._serializeTextures(model);
    
    // Add the lights to the result
    result += this._serializeLights(model);

    result += 'model\r\n';
    // Add the size to the result
    let size = model.voxels.bounds.size;
    if (size.y === size.x && size.z === size.x)
      result += `size = ${size.x*repeat}\r\n`;
    else
      result += `size = ${size.x*repeat} ${size.y*repeat} ${size.z*repeat}\r\n`;
    
    if (model.shape !== 'box')
      result += `shape = ${model.shape}\r\n`;
    
    // Add the scale
    if (model.scale.x !== 1 || model.scale.y !== 1 || model.scale.z !== 1 || repeat !== 1) {
      if (model.scale.y === model.scale.x && model.scale.z === model.scale.x)
        result += `scale = ${model.scale.x/repeat}\r\n`;
      else
        result += `scale = ${model.scale.x/repeat} ${model.scale.y/repeat} ${model.scale.z/repeat}\r\n`;
    }

    if (model.autoResize)
      result += `autoresize = true\r\n`;

    // Add the rotation (degrees)
    if (model.rotation.x !== 0 || model.rotation.y !== 0 || model.rotation.z !== 0) {
      result += `rotation = ${model.rotation.x} ${model.rotation.y} ${model.rotation.z}\r\n`;
    }
    
    // Add the position (in world scale)
    if (model.position.x !== 0 || model.position.y !== 0 || model.position.z !== 0) {
      result += `position = ${model.position.x} ${model.position.y} ${model.position.z}\r\n`;
    }

    if (model.origin)        result += `origin = ${model.origin}\r\n`;
    if (model.flatten)       result += `flatten = ${model.flatten}\r\n`;
    if (model.clamp)         result += `clamp = ${model.clamp}\r\n`;
    if (model.skip)          result += `skip = ${model.skip}\r\n`;
    if (model.tile)          result += `tile = ${model.tile}\r\n`;
    
    if (model.ao)            result += `ao =${model.ao.color.toString() !== '#000'?' ' + model.ao.color:''} ${model.ao.maxDistance} ${model.ao.strength}${model.ao.angle !== 70 ? ' ' + model.ao.angle:''}\r\n`;
    if (model.asSides)       result += `aosides = ${model.aoSides}\r\n`;
    if (model.asSamples)     result += `aosamples = ${model.aoSamples}\r\n`;
    
    if (model.wireframe)     result += `wireframe = true\r\n`;
    
    if (model.shell)         result += `shell = ${this._getShell(model.shell)}\r\n`;

    // Add the materials and colors to the result
    result += this._serializeMaterials(model);

    // Add the voxels to the result
    if (!compressed || repeat !== 1)
      result += this._serializeVoxels(model, repeat);
    else  
      result += this._serializeVoxelsRLE(model, 100);

    return result;
  }
  
  /**
   * Serialize the textures of the model.
   * @param model The model data, including the textures.
   */
  static _serializeTextures(model) {  
    let result = '';
    let newLine = '';
    Object.getOwnPropertyNames(model.textures).forEach(function(textureName) {
      let texture = model.textures[textureName];
      
      let settings = [];
      settings.push(`id = ${texture.id}`);
      if (texture.cube)
        settings.push(`cube = true`);
      settings.push(`image = ${texture.image}`);

      result += `texture ${settings.join(', ')}\r\n`;  
      newLine = "\r\n";
    });
    
    result += newLine;
    
    return result;
  }  
  
  /**
   * Serialize the lights of the model.
   * @param model The model data, including the lights.
   */
  static _serializeLights(model) {  
    let result = '';
    let newLine = '';
    model.lights.forEach(function(light) {  
      
      let settings = [];
      let colorAndStrength = `${light.color}`;
      if (light.strength !== 1)
        colorAndStrength +=  ` ${light.strength}`;
      settings.push(`color = ${colorAndStrength}`);
      if (light.direction)      settings.push(`direction = ${light.direction.x} ${light.direction.y} ${light.direction.z}`);
      if (light.position)       settings.push(`position = ${light.position.x} ${light.position.y} ${light.position.z}`);
      if (light.distance)       settings.push(`distance = ${light.distance}`);
      if (light.size) {
        settings.push(`size = ${light.size}`);
        if (light.detail !== 1) settings.push(`detail = ${light.detail}`);
      }
    
      result += `light ${settings.join(', ')}\r\n`;    
      newLine = '\r\n';
    });

    result += newLine;
    
    return result;
  }
  
  /**
   * Serialize the materials of the model.
   * @param model The model data, including the materials.
   */
  static _serializeMaterials(model) {  
    let result = '';
    model.materials.forEach(function(material) {   
      if (material.colors.length === 0)
        return;
      
      let settings = [];
      
      if (material.type !== SVOX.MATSTANDARD) settings.push(`type = ${material.type}`);
      if (material.lighting !== SVOX.fLAT)    settings.push(`lighting = ${material.lighting}`);
      if (material.wireframe)                 settings.push(`wireframe = true`);
      if (material.roughness !== 1.0)         settings.push(`roughness = ${material.roughness}`);
      if (material.metalness !== 0.0)         settings.push(`metalness = ${material.metalness}`);
      if (material.fade)                      settings.push(`fade = true`);
      if (material.opacity !== 1.0)           settings.push(`opacity = ${material.opacity}`);
      if (material.transparent)               settings.push(`transparent = true`);
      if (material.emissive)                  settings.push(`emissive = ${material.emissive.color} ${material.emissive.intensity}`);
      if (!material.fog)                      settings.push(`fog = false`);
      if (material.side !== SVOX.FRONT)       settings.push(`side = ${material.side}`);
      
      if (material.deform)                    settings.push(`deform = ${material.deform.count} ${material.deform.strength}${material.deform.damping !==1 ? ' ' + material.deform.damping : ''}`);
      if (material.warp)                      settings.push(`warp = ${material.warp.amplitude} ${material.warp.frequency}`);
      if (material.scatter)                   settings.push(`scatter = ${material.scatter}`);

      if (material.ao)                        settings.push(`ao =${material.ao.color !== '#000'?' ' + material.ao.color:''} ${material.ao.maxDistance} ${material.ao.strength}${material.ao.angle !== 70 ? ' ' + material.ao.angle:''}`);
      if (model.lights.length > 0 && !material.lights) settings.push(`lights = false`);
      
      if (material.flatten)                   settings.push(`flatten = ${material.flatten}`);
      if (material.clamp)                     settings.push(`clamp = ${material.clamp}`);
      if (material.skip)                      settings.push(`skip = ${material.skip}`); 
      
      if (material.map)                       settings.push(`map = ${material.map.id}`);
      if (material.normalMap)                 settings.push(`normalmap = ${material.normalMap.id}`);
      if (material.roughnessMap)              settings.push(`roughnessmap = ${material.roughnessMap.id}`);
      if (material.metalnessMap)              settings.push(`metalnessmap = ${material.metalnessMap.id}`);
      if (material.emissiveMap)               settings.push(`emissivemap = ${material.emissiveMap.id}`);
      if (material.matcap)                    settings.push(`matcap = ${material.matcap.id}`);
      
      if (material.mapTransform.uscale !== -1 || material.mapTransform.vscale !== -1) {
        let transform = `maptransform =`;  
        transform += ` ${material.mapTransform.uscale} ${material.mapTransform.vscale}`;
        if (material.mapTransform.uoffset !== 0 || material.mapTransform.voffset !== 0 || material.mapTransform.rotation !==0 ) {
          transform += ` ${material.mapTransform.uoffset} ${material.mapTransform.voffset}`;
          if (material.mapTransform.rotation !==0 )
            transform += ` ${material.mapTransform.rotation}`;
        }
        settings.push(transform);
      }
      
      if (material.shell)                     settings.push(`shell = ${this._getShell(material.shell)}`);
      
      result += 'material ' + settings.join(', ') + '\r\n';
      result += `  colors =`;
      material.colors.forEach(function(color) {
        result += ` ${color.id}${color.exId == null ? '' : '(' + color.exId + ')'}:${color}`;
      });

      result += '\r\n';
    }, this);

    return result;
  }
  
  /**
   * Calculate the color Id, after sorting the colors on usage.
   * This ensures often used colors are encoded as one character A-Z.
   * If there are more then 26 colors used the other colors are Aa, Ab, ... Ba, Bb, etc. or even Aaa, Aab, etc.
   * @param model The sorted index of the color.
   */
  static _colorIdForIndex(index) {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let id = '';
    do {
      let mod = index % 26;
      id = chars[mod] + id.toLowerCase();
      index = (index - mod) / 26;
      if (index<26)
        chars = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    } while (index > 0);
    return id;
  }
  
  /**
   * Create shell string to write
   * @param shell array of shells
   */
  static _getShell(shell) {
    if (shell.length === 0)
      return  'none';
    
    let result = '';
    for (let sh = 0; sh < shell.length; sh++) {
      result += `${shell[sh].colorId} ${shell[sh].distance} `;
    }
    return result.trim();
  }
  
  /**
   * Serialize the voxels without runlength encoding.
   * This results in a recognizable manualy editable syntax
   * @param model The model data
   */
  static _serializeVoxels(model, repeat) {
    let result = 'voxels =\r\n';
    
    let voxels = model.voxels;
    for (let z = voxels.minZ; z <= voxels.maxZ; z++) {
      for (let zr = 0; zr<repeat; zr++) {
        for (let y = voxels.minY; y <= voxels.maxY; y++) {
          for (let yr = 0; yr<repeat; yr++) {
            for (let x = voxels.minX; x <= voxels.maxX; x++) {
              let voxel = voxels.getVoxel(x,y,z);
              for (let xr = 0; xr<repeat; xr++) {
                if (voxel)
                  result += voxel.color.id;
                else 
                  result += '-';
              }
            }
            result += ' ';
          }
        }
        result += `\r\n`;
      }
    }

    return result;
  }
  
  /**
   * Serialize the voxels with runlength encoding.
   * Recognizing repeated patterns only in the compression window size
   * @param model The model data.
   * @param compressionWindow Typical values are from 10 to 100. 
   */
  static _serializeVoxelsRLE(model, compressionWindow) {
    let queue = [];
    let count = 0;
    let lastColor = undefined;
    
    // Loop over the model, RLE-ing subsequent same colors  
    model.voxels.forEachInBoundary(function(voxel) {
      let color = voxel ? voxel.color : null;
      if (color === lastColor) {
        count++;
      } 
      else {
        // Add this chunk to the RLE queue
        this._addRleChunk(queue, lastColor, count, compressionWindow);
        lastColor = color;
        count = 1;
      }
    }, this);
    
    // Add the last chunk to the RLE queue
    this._addRleChunk(queue, lastColor, count, compressionWindow);
    
    // Create the final result string
    let result = '';
    for (const item of queue) {
      result += this._rleToString(item);
    }
    
    return 'voxels =\r\n' + result + '\r\n'; //.match(/.{1,100}/g).join('\r\n') + '\r\n';
  }

  /**
   * Add a chunk (repeat count + color ID, e.g. 13A, 24Aa or 35-) the RLE queue.
   * @param queue The RLE queue.
   * @param color The color to add.
   * @param count The number of times this color is repeated over the voxels.
   * @param compressionWindow Typical values are from 10 to 100.
   */
  static _addRleChunk(queue, color, count, compressionWindow) {
    if (count === 0) 
      return;
  
    // Add the chunk to the RLE queue
    let chunk = count > 1 ? count.toString() : '';
    chunk += color ? color.id : '-';
    queue.push([chunk, 1, chunk]);

    // Check for repeating patterns of length 1 to the compression window 
    for (let k = Math.max(0, queue.length - compressionWindow * 2); k <= queue.length-2; k++) {
      let item = queue[k][0];
      
      // First cherk if there is a repeating pattern
      for (let j = 1; j < compressionWindow; j++) {
        if (k + 2 * j > queue.length) 
          break; 
        let repeating = true;
        for (let i = 0; i <= j - 1; i++) {
          repeating = queue[k+i][2] === queue[k+i+j][2];
          if (!repeating) break;
        }
        if (repeating) {
          // Combine the repeating pattern into a sub array and remove the two occurences
          let arr = queue.splice(k, j);
          queue.splice(k, j-1);          
          queue[k] = [ arr, 2, null];
          queue[k][2] = JSON.stringify(queue[k]); // Update for easy string comparison
          k = queue.length;
          break;
        }
      }
    
      if (Array.isArray(item) && queue.length > k + item.length) {
        // This was already a repeating pattern, check if it repeats again
        let array = item;
        let repeating = true;
        for (let i = 0; i < array.length; i++) { 
          repeating = array[i][2] === queue[k + 1 + i][2];
          if (!repeating) break;
        }
        if (repeating) {
          // Eemove the extra pattern and increase the repeat count
          queue.splice(k+1, array.length);
          queue[k][1]++;
          queue[k][2] = null;
          queue[k][2] = JSON.stringify(queue[k]); // Update for easy string comparison
          k = queue.length;
        }
      }
    }
  }

  /**
   * Converts one (recursive RLE) chunk to a string.
   * @param chunk the entire RLE queue to start then recursivly the nested chunks.
   */
  static _rleToString(chunk) {
    let result = chunk[1] === 1 ? '' : chunk[1].toString();
    let value = chunk[0];
    if (Array.isArray(value))
    {
      result += '('; 
      for (let sub of value) {
        result += this._rleToString(sub);
      }
      result += ')';
    }    
    else {
      result += value;
    }

    return result;
  }

}

// =====================================================
// /smoothvoxels/svox/meshgenerator.js
// =====================================================

// Generates a clean js mesh data model, which serves as the basis for transformation in the SvoxToThreeMeshConverter or the SvoxToAFrameConverter
class SvoxMeshGenerator {

  static generate(model) {
  
    let mesh = {
      materials: [],
      groups: [],
      positions: [],
      normals: [],
      colors: [],
      uvs: null,
    };

    model.prepareForRender();
    
    let generateUVs = false;
    model.materials.baseMaterials.forEach(function(material) {
      if (material.colorUsageCount > 0) {
        material.index = mesh.materials.length;
        mesh.materials.push(SvoxMeshGenerator._generateMaterial(material, model));
        generateUVs = generateUVs || material.map || material.normalMap || material.roughnessMap || material.metalnessMap || material.emissiveMap;
      }
    }, this);

    if (generateUVs)
      mesh.uvs = [];
    
    //SvoxMeshGenerator._generateVoxels(model, mesh);
        
    //SvoxMeshGenerator._generateShells(model, mesh);
    
    SvoxMeshGenerator._generateAll(model, mesh);
    
    SvoxMeshGenerator._generateLights(model, mesh);

    return mesh;
  }

  static _generateMaterial(definition, modeldefinition) {
    let ao = definition.ao || modeldefinition.ao;
    
    let material = { 
        type:              definition.type,
        roughness:         definition.roughness,
        metalness:         definition.metalness,
        opacity:           definition.opacity,
        alphaTest:         definition.alphaTest,
        transparent:       definition.isTransparent,
        wireframe:         definition.wireframe || modeldefinition.wireframe,
        fog:               definition.fog,      
        vertexColors:      'FaceColors',
      
        // No back, faces are reverse instead because GLTF does not support back faces
        side:              definition.side === SVOX.DOUBLE ? SVOX.DOUBLE : SVOX.FRONT

      };

    if (definition.type !== SVOX.MATNORMAL) {
      // All materials except normal material support colors
      
      // TODO: When none of the materials needs VertexColors, we should just set the material colors instead of using vertex colors.
      //if (definition.colorCount === 1 && !definition.aoActive && !modeldefinition.ao && modeldefinition.lights.length === 0) {
      //  material.vertexColors = 'NoColors';
      //  material.color = definition.colors[0].toString();
      //}
      //else {
      //  material.vertexColors = 'VertexColors';
      //}
      material.vertexColors = 'VertexColors';
      material.color = "#FFF";
    }
    
    if (definition.emissive) {
      material.emissive = definition.emissive.color.toString();
      material.emissiveIntensity = definition.emissive.intensity;
    }
    
    if (definition.map) {
      material.map = { image:    definition.map.image, 
                       uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                       vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                       uoffset:  definition.mapTransform.uoffset, 
                       voffset:  definition.mapTransform.voffset,
                       rotation: definition.mapTransform.rotation };
    }
    
    if (definition.normalMap) {
      material.normalMap = { image:    definition.normalMap.image, 
                             uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                             vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                             uoffset:  definition.mapTransform.uoffset, 
                             voffset:  definition.mapTransform.voffset,
                             rotation: definition.mapTransform.rotation };
    }
    
    if (definition.roughnessMap) {
      material.roughnessMap = { image:    definition.roughnessMap.image, 
                                uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                                vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                                uoffset:  definition.mapTransform.uoffset, 
                                voffset:  definition.mapTransform.voffset,
                                rotation: definition.mapTransform.rotation };
    }

    if (definition.metalnessMap) {
      material.metalnessMap = { image:    definition.metalnessMap.image, 
                                uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                                vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                                uoffset:  definition.mapTransform.uoffset, 
                                voffset:  definition.mapTransform.voffset,
                                rotation: definition.mapTransform.rotation };
    }

    if (definition.emissiveMap) {
      material.emissiveMap = { image:    definition.emissiveMap.image, 
                               uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                               vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                               uoffset:  definition.mapTransform.uoffset, 
                               voffset:  definition.mapTransform.voffset,
                               rotation: definition.mapTransform.rotation };
    }

    if (definition.matcap) {
      material.matcap = { image: definition.matcap.image };
    }

    return material;
  }
  
  static _generateAll(model, mesh) {
    let shells = SvoxMeshGenerator._getAllShells(model);

    // Add all vertices to the geometry     
    model.materials.baseMaterials.forEach(function(material) {
      if (material.colorUsageCount > 0) {

        let start = mesh.positions.length;

        model.voxels.forEach(function(voxel) {
          
          if (voxel.material.index === material.index) {
            SvoxMeshGenerator._generateVoxel(model, voxel, mesh);
          }
          
          shells.forEach(function (shell) {
            if (shell.shellMaterialIndex === material.index &&
                shell.voxelMaterial === voxel.color.material) {
              SvoxMeshGenerator._generateVoxelShell(model, voxel, mesh, shell.distance, shell.color);
            }
          }, this);
          
        }, this);
        
        // Add the group for this material
        let end = mesh.positions.length;
        mesh.groups.push( { start:start/3, count: (end-start)/3, materialIndex:material.index } );       
        
      }      
    }, this);       
  }

  
  static _generateVoxels(model, mesh) {
    // Add all vertices to the geometry     
    model.materials.baseMaterials.forEach(function(material) {
      if (material.colorUsageCount > 0) {
        let start = mesh.positions.length;
        model.voxels.forEach(function(voxel) {
          if (voxel.material.index === material.index) {
            SvoxMeshGenerator._generateVoxel(model, voxel, mesh);
          }
        }, this);
        let end = mesh.positions.length;

        // Add the group for this material
        mesh.groups.push( { start:start/3, count: (end-start)/3, materialIndex:material.index } ); 
      }      
    }, this);    
  }

  static _generateVoxel(model, voxel, mesh) {
    for (let f = 0; f < SVOX._FACES.length; f++) {
      let face = voxel.faces[SVOX._FACES[f]];
      if (face && !face.skipped) {
        SvoxMeshGenerator._generateVoxelFace(model, voxel, face, mesh);
      }  
    }
  }

  static _generateVoxelFace(model, voxel, face, mesh) {
    let vert0, vert1, vert2, vert3;
    let norm0, norm1, norm2, norm3;
    let col0, col1, col2, col3;
    let uv0, uv1, uv2, uv3;
    
    vert0 = face.vertices[0];
    vert1 = face.vertices[1];
    vert2 = face.vertices[2];
    vert3 = face.vertices[3];
    
    norm0 = face.normals[0];
    norm1 = face.normals[1];
    norm2 = face.normals[2];
    norm3 = face.normals[3];
    
    if (face.vertexColors) {
      col0 = face.vertexColors[0];
      col1 = face.vertexColors[1];
      col2 = face.vertexColors[2];
      col3 = face.vertexColors[3];
    }
    
    if (mesh.uvs) {
      uv0 = face.uv[0] || { u:0, v:0 };
      uv1 = face.uv[1] || { u:0, v:0 };
      uv2 = face.uv[2] || { u:0, v:0 };
      uv3 = face.uv[3] || { u:0, v:0 };
    }
        
    if (voxel.color.material.side === 'back') {
      let swap;
      swap = vert0; vert0 = vert2; vert2 = swap;
      swap = norm0; norm0 = norm2; norm2 = swap;
      swap =  col0;  col0 =  col2;  col2 = swap;
      swap =   uv0;   uv0 =   uv2;   uv2 = swap;
    }
    
    // TODO: move to prepare for render, now it is done multiple times
    if (face.vertexColors && SVOX.clampColors) {
      SvoxMeshGenerator._clampColor(col0);
      SvoxMeshGenerator._clampColor(col1);
      SvoxMeshGenerator._clampColor(col2);
      SvoxMeshGenerator._clampColor(col3);
    }
    
    // Face 1
    mesh.positions.push(vert2.x, vert2.y, vert2.z); 
    mesh.positions.push(vert1.x, vert1.y, vert1.z); 
    mesh.positions.push(vert0.x, vert0.y, vert0.z); 
    
    // Face 2
    mesh.positions.push(vert0.x, vert0.y, vert0.z); 
    mesh.positions.push(vert3.x, vert3.y, vert3.z); 
    mesh.positions.push(vert2.x, vert2.y, vert2.z); 
    
    if (voxel.material.lighting === SVOX.FLAT) {
      let norm1 = face.normals[1];
      let norm3 = face.normals[3];
      
      // Face 1
      mesh.normals.push(norm1.x, norm1.y, norm1.z);
      mesh.normals.push(norm1.x, norm1.y, norm1.z);
      mesh.normals.push(norm1.x, norm1.y, norm1.z);

      // Face 2
      mesh.normals.push(norm3.x, norm3.y, norm3.z);
      mesh.normals.push(norm3.x, norm3.y, norm3.z);
      mesh.normals.push(norm3.x, norm3.y, norm3.z);
    }
    else {
 
      // Face 1
      mesh.normals.push(norm2.x, norm2.y, norm2.z);
      mesh.normals.push(norm1.x, norm1.y, norm1.z);
      mesh.normals.push(norm0.x, norm0.y, norm0.z);

      // Face 2
      mesh.normals.push(norm0.x, norm0.y, norm0.z);
      mesh.normals.push(norm3.x, norm3.y, norm3.z);
      mesh.normals.push(norm2.x, norm2.y, norm2.z);
    }    
    
    if (face.vertexColors) {            
      // Face 1
      mesh.colors.push(col2.r, col2.g, col2.b); 
      mesh.colors.push(col1.r, col1.g, col1.b); 
      mesh.colors.push(col0.r, col0.g, col0.b); 

      // Face 2
      mesh.colors.push(col0.r, col0.g, col0.b); 
      mesh.colors.push(col3.r, col3.g, col3.b); 
      mesh.colors.push(col2.r, col2.g, col2.b); 
    }
    else if (face.color) {
        // Face colors, so all vertices for both faces are the same color
        for (let v=0; v<6; v++) {
          mesh.colors.push(face.color.r, face.color.g, face.color.b);
        }
    }
    else {
        // Material colors
        let color = voxel.color;
        for (let v=0; v<6; v++) {
          mesh.colors.push(color.r, color.g, color.b);
        }
    }
      
    if (mesh.uvs) {
     
      // Face 1
      mesh.uvs.push(uv2.u, uv2.v);
      mesh.uvs.push(uv1.u, uv1.v);
      mesh.uvs.push(uv0.u, uv0.v);

      // Face 1
      mesh.uvs.push(uv0.u, uv0.v);
      mesh.uvs.push(uv3.u, uv3.v);
      mesh.uvs.push(uv2.u, uv2.v);
    }
  }
  
  static _clampColor(color) {
    color.r = Math.max(Math.min(color.r, 1.0), 0.0);
    color.g = Math.max(Math.min(color.g, 1.0), 0.0);
    color.b = Math.max(Math.min(color.b, 1.0), 0.0);
  }
  
  static _generateLights(model, mesh) {
    if (model.lights.some((light) => light.size)) {
      
      // The octahedron that will be subdivided depending on the light.detail
      let vTop      = { x: 0, y: 1, z: 0 };
      let vFront    = { x: 0, y: 0, z:-1 };
      let vRight    = { x: 1, y: 0, z: 0 };
      let vBack     = { x: 0, y: 0, z: 1 };
      let vLeft     = { x:-1, y: 0, z: 0 };
      let vBottom   = { x: 0, y:-1, z: 0 };

      let start = mesh.positions.length;
      model.lights.filter(l => l.position).forEach(function(light) {
        if (light.size > 0) {
          let scale = light.size / 2;
          let detail = light.detail;

          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vFront, vRight,  vTop  , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vRight, vBack,   vTop  , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vBack,  vLeft,   vTop  , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vLeft,  vFront,  vTop  , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vFront, vBottom, vRight, mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vRight, vBottom, vBack , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vBack,  vBottom, vLeft , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vLeft,  vBottom, vFront, mesh);
        }
      });
      let end = mesh.positions.length;
      
      // Add the group for the lights (it always uses the first material, so index 0)
      mesh.groups.push( { start: start/3, count: (end-start)/3, materialIndex: 0 } );           
    }
  }
  
  static _createLightFace(position, color, scale, divisions, v0, v1, v2, mesh) {
    if (divisions === 0) {
      mesh.positions.push(position.x + v2.x * scale, position.y + v2.y * scale, position.z + v2.z * scale); 
      mesh.positions.push(position.x + v1.x * scale, position.y + v1.y * scale, position.z + v1.z * scale); 
      mesh.positions.push(position.x + v0.x * scale, position.y + v0.y * scale, position.z + v0.z * scale); 

      mesh.normals.push(0.0, 0.0, 1.0);
      mesh.normals.push(0.0, 0.0, 1.0);
      mesh.normals.push(0.0, 0.0, 1.0);

      mesh.colors.push(color.r, color.g, color.b);
      mesh.colors.push(color.r, color.g, color.b);
      mesh.colors.push(color.r, color.g, color.b);

      if (mesh.uvs) {
        mesh.uvs.push(0.0, 0.0);
        mesh.uvs.push(0.0, 0.0);
        mesh.uvs.push(0.0, 0.0);
      }    
    }
    else {
      // Recursively subdivide untill we have the number of divisions we need
      let v10 = SvoxMeshGenerator._normalize( { x:(v1.x+v0.x)/2, y:(v1.y+v0.y)/2, z:(v1.z+v0.z)/2 } );  
      let v12 = SvoxMeshGenerator._normalize( { x:(v1.x+v2.x)/2, y:(v1.y+v2.y)/2, z:(v1.z+v2.z)/2 } );
      let v02 = SvoxMeshGenerator._normalize( { x:(v0.x+v2.x)/2, y:(v0.y+v2.y)/2, z:(v0.z+v2.z)/2 } );
      SvoxMeshGenerator._createLightFace(position, color, scale, divisions-1, v10, v1,  v12, mesh);
      SvoxMeshGenerator._createLightFace(position, color, scale, divisions-1, v0,  v10, v02, mesh);
      SvoxMeshGenerator._createLightFace(position, color, scale, divisions-1, v02, v12, v2,  mesh);
      SvoxMeshGenerator._createLightFace(position, color, scale, divisions-1, v10, v12, v02, mesh);
    }
  }
  

  static _getAllShells(model) {
   
    let shells = [];
    
    model.materials.forEach(function (material) {    
      
      let shell = undefined
      if (model.shell && model.shell.length > 0 && !material.shell)
        shell = model.shell;
      if (material.shell && material.shell.length > 0)
        shell = material.shell;
      
      if (shell) {
        shell.forEach(function (sh) {
          shells.push({
            voxelMaterial: material,
            shellMaterialIndex: sh.color.material.index,
            color: sh.color,
            distance: sh.distance
          });
        }, this);
      }
    }, this);
    
    shells.sort(function(a,b) {
      let v = a.shellMaterialIndex - b.shellMaterialIndex;
    });
    
    return shells;
  };
    
 
  static _generateShells(model, mesh) {
    
    let shells = SvoxMeshGenerator._getAllShells(model);
   
    shells.forEach(function (shell) {
      
        let start = mesh.positions.length;
      
        model.voxels.forEach(function(voxel) {
          if (voxel.color.material === shell.voxelMaterial) {
            SvoxMeshGenerator._generateVoxelShell(model, voxel, mesh, shell.distance, shell.color);
          }
        }, this);
      
        let end = mesh.positions.length;
      
        // Add the group for the shell
        mesh.groups.push( { start:start/3, count: (end-start)/3, materialIndex: shell.shellMaterialIndex } );         
    });
  }
  
  static _generateVoxelShell(model, voxel, mesh, distance, color) {
    for (let f = 0; f < SVOX._FACES.length; f++) {
      let face = voxel.faces[SVOX._FACES[f]];
      if (face && !face.skipped) {
        SvoxMeshGenerator._generateVoxelShellFace(model, voxel, face, mesh, distance, color);
      }  
    }
  }

  static _generateVoxelShellFace(model, voxel, face, mesh, distance, color) {
    let vert0, vert1, vert2, vert3;
    let norm0, norm1, norm2, norm3;
    let col0, col1, col2, col3;
    let uv0, uv1, uv2, uv3;
    
    vert0 = face.vertices[0];
    vert1 = face.vertices[1];
    vert2 = face.vertices[2];
    vert3 = face.vertices[3];
    
    norm0 = vert0.averageNormal;
    norm1 = vert1.averageNormal;
    norm2 = vert2.averageNormal;
    norm3 = vert3.averageNormal;
    
    if (mesh.uvs) {
      uv0 = face.uv[0] || { u:0.0001, v:0.0001 };
      uv1 = face.uv[1] || { u:0.0001, v:0.9999 };
      uv2 = face.uv[2] || { u:0.9999, v:0.9999 };
      uv3 = face.uv[3] || { u:0.9999, v:0.0001 };
    }
        
    if (color.material.side === 'back') {
      let swap;
      swap = vert0; vert0 = vert2; vert2 = swap;
      swap = norm0; norm0 = norm2; norm2 = swap;
      swap =  col0;  col0 =  col2;  col2 = swap;
      swap =   uv0;   uv0 =   uv2;   uv2 = swap;
    }

    // Push out the vertices according to the average normals
    vert0 = { x:vert0.x + norm0.x * distance * model.scale.x,  
              y:vert0.y + norm0.y * distance * model.scale.y,
              z:vert0.z + norm0.z * distance * model.scale.z };
    vert1 = { x:vert1.x + norm1.x * distance * model.scale.x,  
              y:vert1.y + norm1.y * distance * model.scale.y,
              z:vert1.z + norm1.z * distance * model.scale.z };
    vert2 = { x:vert2.x + norm2.x * distance * model.scale.x,  
              y:vert2.y + norm2.y * distance * model.scale.y,
              z:vert2.z + norm2.z * distance * model.scale.z };
    vert3 = { x:vert3.x + norm3.x * distance * model.scale.x,  
              y:vert3.y + norm3.y * distance * model.scale.y,
              z:vert3.z + norm3.z * distance * model.scale.z };
    
    // Face 1
    mesh.positions.push(vert2.x, vert2.y, vert2.z); 
    mesh.positions.push(vert1.x, vert1.y, vert1.z); 
    mesh.positions.push(vert0.x, vert0.y, vert0.z); 
    
    // Face 2
    mesh.positions.push(vert0.x, vert0.y, vert0.z); 
    mesh.positions.push(vert3.x, vert3.y, vert3.z); 
    mesh.positions.push(vert2.x, vert2.y, vert2.z);     

    // Face 1
    mesh.normals.push(norm2.x, norm2.y, norm2.z);
    mesh.normals.push(norm1.x, norm1.y, norm1.z);
    mesh.normals.push(norm0.x, norm0.y, norm0.z);

    // Face 2
    mesh.normals.push(norm0.x, norm0.y, norm0.z);
    mesh.normals.push(norm3.x, norm3.y, norm3.z);
    mesh.normals.push(norm2.x, norm2.y, norm2.z);
    
    for (let v=0; v<6; v++) {
      mesh.colors.push(color.r, color.g, color.b);
    }
      
    if (mesh.uvs) {     
      // Face 1
      mesh.uvs.push(uv2.u, uv2.v);
      mesh.uvs.push(uv1.u, uv1.v);
      mesh.uvs.push(uv0.u, uv0.v);

      // Face 1
      mesh.uvs.push(uv0.u, uv0.v);
      mesh.uvs.push(uv3.u, uv3.v);
      mesh.uvs.push(uv2.u, uv2.v);
    }
  }
  
  static _normalize(v) {
    let l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    v.x /= l; 
    v.y /= l; 
    v.z /= l;
    return v;
  } 
}

// =====================================================
// /smoothvoxels/aframe/svoxtothreemeshconverter.js
// =====================================================

class SvoxToThreeMeshConverter {
   
  static generate(model) {

    let materials = [];
    
    model.materials.forEach(function(material) {
      materials.push(SvoxToThreeMeshConverter._generateMaterial(material));
    }, this);

    let geometry = new THREE.BufferGeometry();
    
    // Set the geometry attribute buffers from the model 
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute(model.positions, 3) );
    geometry.setAttribute( 'normal',   new THREE.Float32BufferAttribute(model.normals, 3) );
    geometry.setAttribute( 'color',    new THREE.Float32BufferAttribute(model.colors, 3) );
    if (model.uvs)
      geometry.setAttribute( 'uv',     new THREE.Float32BufferAttribute(model.uvs, 2) );

    let indices = [];
    for (let i = 0; i < model.positions.length / 3; i++) {
      indices.push(i);
    }
    geometry.setIndex(indices);

    // Add the groups for each material
    model.groups.forEach(function(group) {
      geometry.addGroup(group.start, group.count, group.materialIndex); 
    }, this);
    
    geometry.computeBoundingBox();
    geometry.uvsNeedUpdate = true;
    
    //geometry = THREE.BufferGeometryUtils.mergeVertices(geometry);
    
    let mesh = new THREE.Mesh(geometry, materials);
    //return new THREE.VertexNormalsHelper(mesh, 0.1);
    //return new THREE.FaceNormalsHelper(mesh, 0.1);
    
    
    return mesh;
  }

  static _generateMaterial(definition) {

    // Remove / add parameters depending on material type, this also prevents console warnings    
    if (definition.type !== 'standard') {
      delete definition.roughness;
      delete definition.metalness;
    }
    delete definition.index;
    
    //if (definition.type === 'matcap' || definition.type === 'normal' || definition.type === 'toon') {
    //  delete definition.envMap;
    //}
    
    if (definition.type === 'matcap') {
      delete definition.wireframe;
    }
    
    if (definition.type === 'basic' || definition.type === 'lambert' || definition.type === 'phong') {
      // Create reflectivity from roughness
      definition.reflectivity = 1 - definition.roughness;
    }

    switch(definition.side) {
      case 'back':   definition.side = THREE.BackSide;   break;  // Should never occur, faces are reversed instead  
      case 'double': definition.side = THREE.DoubleSide; break;    
      default:       definition.side = THREE.FrontSide;  break;    
    }   
    
    // Color encodings according to https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
    // TODO: Should color management be addressed aywhere else?

    if (definition.map) {
      definition.map = SvoxToThreeMeshConverter._generateTexture(definition.map.image, THREE.sRGBEncoding,
                                                                 definition.map.uscale, definition.map.vscale,
                                                                 definition.map.uoffset, definition.map.voffset, definition.map.rotation);
    }
    
    if (definition.normalMap) {
      definition.normalMap = SvoxToThreeMeshConverter._generateTexture(definition.normalMap.image, THREE.LinearEncoding,
                                                                       definition.normalMap.uscale, definition.normalMap.vscale,
                                                                       definition.normalMap.uoffset, definition.normalMap.voffset, definition.normalMap.rotation);
    }
    
    if (definition.roughnessMap) {
      definition.roughnessMap = SvoxToThreeMeshConverter._generateTexture(definition.roughnessMap.image, THREE.LinearEncoding,
                                                                          definition.roughnessMap.uscale,  definition.roughnessMap.vscale,
                                                                          definition.roughnessMap.uoffset, definition.roughnessMap.voffset, definition.roughnessMap.rotation);
    }

    if (definition.metalnessMap) {
      definition.metalnessMap = SvoxToThreeMeshConverter._generateTexture(definition.metalnessMap.image, THREE.LinearEncoding,
                                                                          definition.metalnessMap.uscale,  definition.metalnessMap.vscale,
                                                                          definition.metalnessMap.uoffset, definition.metalnessMap.voffset, definition.metalnessMap.rotation);
    }

    if (definition.emissiveMap) {
      definition.emissiveMap = SvoxToThreeMeshConverter._generateTexture(definition.emissiveMap.image, THREE.sRGBEncoding,
                                                                         definition.emissiveMap.uscale,  definition.emissiveMap.vscale,
                                                                         definition.emissiveMap.uoffset, definition.emissiveMap.voffset, definition.emissiveMap.rotation);
    }

    if (definition.matcap) {
      definition.matcap = SvoxToThreeMeshConverter._generateTexture(definition.matcap.image, THREE.sRGBEncoding);
    }
    
    let material = null;
    let type = definition.type;
    delete definition.type;
    switch (type) {
      case 'standard':
        material = new THREE.MeshStandardMaterial(definition); 
        break;        
      case 'basic':
        material = new THREE.MeshBasicMaterial(definition); 
        break;        
      case 'lambert':
        material = new THREE.MeshLambertMaterial(definition); 
        break;        
      case 'phong':
        material = new THREE.MeshPhongMaterial(definition); 
        break;        
      case 'matcap':
        material = new THREE.MeshMatcapMaterial(definition); 
        break;        
      case 'toon':
        material = new THREE.MeshToonMaterial(definition); 
        break;        
      case 'normal':
        material = new THREE.MeshNormalMaterial(definition); 
        break;        
      default: {
        throw {
          name: 'SyntaxError',
          message: `Unknown material type '${type}'.`
        };            
      }
    }

    return material;
  }
  
  static _generateTexture(image, encoding, uscale, vscale, uoffset, voffset, rotation) { 
    let threetexture = new THREE.TextureLoader().load( image );
    threetexture.encoding = encoding;
    threetexture.repeat.set(1 / uscale, 1 / vscale);
    threetexture.wrapS = THREE.RepeatWrapping;
    threetexture.wrapT = THREE.RepeatWrapping;
    threetexture.offset = new THREE.Vector2(uoffset, voffset);
    threetexture.rotation = rotation * Math.PI / 180;
    return threetexture;
  }
  
}

// =====================================================
// /smoothvoxels/aframe/workerpool.js
// =====================================================

class WorkerPool {

  // workerfile: e.g. "/smoothvoxelworker.js"
  constructor(workerFile, resultHandler, resultCallback) {
    this._workerFile = workerFile;
    this._resultHandler = resultHandler;
    this._resultCallback = resultCallback;
    this._nrOfWorkers = window.navigator.hardwareConcurrency;
    this._workers = []; // The actual workers
    this._free = [];    // Array of free worker indexes
    this._tasks = [];   // Array of tasks to perform
  }

  executeTask(task) {
    // Create max nrOfWorkers web workers
    if (this._workers.length < this._nrOfWorkers) {
      
      // Create a new worker and mark it as free by adding its index to the free array
      let worker = new Worker(this._workerFile);
      
      // On message handler
      let _this = this;
      worker.onmessage = function(task) {
        
          // Mark the worker as free again, process the next task and process the result
          _this._free.push(event.data.worker);        
          _this._processNextTask();
          _this._resultCallback.apply(_this._resultHandler, [ event.data ]);
      };
      
      this._free.push(this._workers.length);
      this._workers.push(worker);
    }
    
    this._tasks.push(task);
    
    this._processNextTask();    
  }
  
  _processNextTask() {
    if (this._tasks.length > 0 && this._free.length > 0) {
      let task = this._tasks.shift();
      task.worker = this._free.shift();
      let worker = this._workers[task.worker];
      worker.postMessage(task);
    }    
  }

};

// =====================================================
// /smoothvoxels/aframe/smoothvoxel.js
// =====================================================

// We are combining this file with others in the minified version that will be used also in the worker.
// Do not register the svox component inside the worker
if("undefined"!==typeof window) {

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

/* ********************************
 * TODO:
 * - Cleanup playground HTML and Code
 * - Multiple models combined in a scene
 * - Model layers (combine multiple layers, e.g. weapon models)
 * - Model animation? (including layers?)
 *
 ***********************************/

SVOX.WORKERPOOL = null;

/**
 * Smooth Voxels component for A-Frame.
 */
AFRAME.registerComponent('svox', {
  schema: {
    model: { type:"string" }, 
    worker: { type:"boolean", default:false }
  },

  /**
   * Set if component needs multiple instancing.
   */
  multiple: false,

  _MISSING: "model size=9,scale=0.05,material lighting=flat,colors=A:#FFFFFF B:#FF8800 C:#FF0000,voxels 10B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-11B7-B-6(7A2-)7A-B7-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B3-C3-B-2(7A2-)7A-C7AC-2(7A2-)7A-B3-C3-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B7-B-6(7A2-)7A-B7-11B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-10B",
  _ERROR: "model size=9,scale=0.05,material lighting=flat,colors=B:#FF8800 C:#FF0000 A:#FFFFFF,voxels 10B7-2(2B2-3C2-2B4-C2-)2B2-3C2-2B7-11B7-B-6(7A2-)7A-B7-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B2-C4-B-2(7A-C7A2C)7A-C7AC-7A-B2-C4-2B2-3C2-B3(-7A-C7AC)-7A-B2-3C2-2B2-C4-B-7A-C2(7AC-7A2C)7AC-7A-B2-C4-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B7-B-6(7A2-)7A-B7-11B7-2(2B2-3C2-2B2-C4-)2B2-3C2-2B7-10B",
  _workerPool: null,
  
  /**
   * Called once when component is attached. Generally for initial setup.
   */
  init: function () { 
    let el = this.el;
    let data = this.data;
    let useWorker = data.worker;
    let error = false;
    
    let modelName = data.model;
    let modelString = SVOX.models[modelName];
    if (!modelString) {
      this._logError(data.model, { name:'ConfigError', message:'Model not found'});
      modelString = this._MISSING;
      error = true;
      useWorker = false;
    }

    if (!useWorker) {
      this._generateModel(modelString, el, error);
    }
    else {
      this._generateModelInWorker(modelString, el);
    }
  },
  
  _generateModel: function(modelString, el, error) {
    let t0 = performance.now();

    let model;
    try {        
        model = ModelReader.readFromString(modelString);
    }
    catch (ex) {
      this._logError(ex);
      model = ModelReader.readFromString(this._ERROR);
      error = true;
    }
    
    try {        
        //let meshGenerator = new MeshGenerator();
        //this.mesh = meshGenerator.generate(model);
    
        let svoxmesh = SvoxMeshGenerator.generate(model);
        this.mesh = SvoxToThreeMeshConverter.generate(svoxmesh);
      
        // Log stats
        let t1 = performance.now();
        let statsText = `Time: ${Math.round(t1 - t0)}ms. Verts:${this.mesh.geometry.attributes.position.count} Faces:${this.mesh.geometry.attributes.position.count / 3} Materials:${this.mesh.material.length}`;
        //console.log(`SVOX ${this.data.model}:  ${statsText}`);     
        let statsEl = document.getElementById('svoxstats');
        if (statsEl && !error)
          statsEl.innerHTML = `Last render: ` + statsText; 
      
        el.setObject3D('mesh', this.mesh);
    }
    catch (error) {
      this._logError(error);
    }    
  },
  
  _generateModelInWorker: function(svoxmodel, el) {
    // Make sure the element has an Id, create a task in the task array and process it
    if (!el.id)
      el.id = new Date().valueOf().toString(36) + Math.random().toString(36).substr(2);
    let task =  { svoxmodel, elementId:el.id };    
    
    if (!SVOX.WORKERPOOL) {
      SVOX.WORKERPOOL = new WorkerPool("/smoothvoxelworker.1.1.0.js", this, this._processResult);
    }
    SVOX.WORKERPOOL.executeTask(task);
  },
  
  _processResult: function(data) {
    if (data.svoxmesh.error) {
      this._logError(data.svoxmesh.error)
    }
    else {
      let mesh = SvoxToThreeMeshConverter.generate(data.svoxmesh);
      let el = document.querySelector('#' + data.elementId);

      el.setObject3D('mesh', mesh);          
    }
  },
  
  _toSharedArrayBuffer(floatArray) {
    let buffer = new Float32Array(new ArrayBuffer(floatArray.length * 4));
    buffer.set(floatArray, 0);
    return buffer;
  },
  
  /**
   * Log errors to the console and an optional div #svoxerrors (as in the playground)
   * @param {modelName} The name of the model being loaded
   * @param {error} Error object with name and message
   */
  _logError: function(error) {
      let errorText = error.name + ": " + error.message;
      let errorElement = document.getElementById('svoxerrors');
      if (errorElement)
        errorElement.innerHTML = errorText;
      console.error(`SVOXERROR (${this.data.model}) ${errorText}`);    
  },

  /**
   * Called when component is attached and when component data changes.
   * Generally modifies the entity based on the data.
   * @param {object} oldData The previous version of the data
   */
  update: function (oldData) { },

  /**
   * Called when a component is removed (e.g., via removeAttribute).
   */
  remove: function () { 
    let maps = ["map", "normalMap",  "roughnessMap", "metalnessMap", "emissiveMap", "matcap"];

    if (this.mesh) {                 // TODO: Test
    
      while (this.mesh.material.length > 0) {
        
         maps.forEach(function(map){
          if (this.mesh.material[0][map]) {
            this.mesh.material[0][map].dispose;
          }
        }, this);

        this.mesh.material[0].dispose();
        this.mesh.material.shift();
      }      
      
      this.mesh.geometry.dispose();
      this.el.removeObject3D('mesh');
      delete this.mesh;
      
    }
  },
  
  /**
   * Called on each scene tick.
   */
  // tick: function (t) { },

  /**
   * Called when entity pauses.
   * Use to stop or remove any dynamic or background behavior such as events.
   */
  pause: function () { },

  /**
   * Called when entity resumes.
   * Use to continue or add any dynamic or background behavior such as events.
   */
  play: function () { },

  /**
   * Event handlers that automatically get attached or detached based on scene state.
   */
  events: {
    // click: function (evt) { }
  }
});

}