export default {
 "version": "5.8.0",
 "functions": [
  {
   "path": [
    "mmg3d"
   ],
   "js": "initFileNames",
   "c": "MMG3D_Init_fileNames",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Initialize file names to their default values. This function initializes all file names to their default values."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "initParameters",
   "c": "MMG3D_Init_parameters",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Initialize parameters to their default values Initialization of the input parameters (stored in the Info structure)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setInputMeshName",
   "c": "MMG3D_Set_inputMeshName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "meshin",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of input mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setOutputMeshName",
   "c": "MMG3D_Set_outputMeshName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "meshout",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of output mesh file."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setInputSolName",
   "c": "MMG3D_Set_inputSolName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "solin",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of input solution file."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setOutputSolName",
   "c": "MMG3D_Set_outputSolName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "solout",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the output solution file."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setInputParamName",
   "c": "MMG3D_Set_inputParamName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "fparamin",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the input parameter file."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setSolSize",
   "c": "MMG3D_Set_solSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "typEntity",
     "kind": "iint"
    },
    {
     "name": "np",
     "kind": "iint"
    },
    {
     "name": "typSol",
     "kind": "iint"
    }
   ],
   "doc": "Initialize a solution field. Initialize a solution field: set dimension, types and number of data. To use to initialize a metric, a level-set or a displacement field."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setSolsAtVerticesSize",
   "c": "MMG3D_Set_solsAtVerticesSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "nsols",
     "kind": "iint"
    },
    {
     "name": "nentities",
     "kind": "iint"
    },
    {
     "name": "typSol",
     "kind": "iarrayint",
     "nullable": false
    }
   ],
   "doc": "Initialize an array of solution values defined at vertices Initialize a solution field defined at vertices: set dimension, types and number of data values. (not used by Mmg itself)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setMeshSize",
   "c": "MMG3D_Set_meshSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "np",
     "kind": "iint"
    },
    {
     "name": "ne",
     "kind": "iint"
    },
    {
     "name": "nprism",
     "kind": "iint"
    },
    {
     "name": "nt",
     "kind": "iint"
    },
    {
     "name": "nquad",
     "kind": "iint"
    },
    {
     "name": "na",
     "kind": "iint"
    }
   ],
   "doc": "Set the number of vertices, tetrahedra, prisms, triangles, quadrilaterals, and edges of a mesh. This function sets the number of vertices, tetrahedra, prisms, triangles, quadrilaterals and edges of the mesh and allocates the associated arrays. If called again, it will reset the whole mesh to reallocate it at the new size"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setVertex",
   "c": "MMG3D_Set_vertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "kind": "idouble"
    },
    {
     "name": "c1",
     "kind": "idouble"
    },
    {
     "name": "c2",
     "kind": "idouble"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the coordinates of a single vertex. This function sets the coordinates of a vertex \\a c0, \\a c1,\\a c2 and reference \\a ref at position \\a pos in mesh structure (from 1 to nb_vertices included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setVertices",
   "c": "MMG3D_Set_vertices",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "vertices",
     "kind": "iarraydouble",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set all vertex coordinates and references in a mesh structure This function sets the coordinates and references of all vertices in a mesh structure. The number of vertices in the mesh must have been set before."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setTetrahedron",
   "c": "MMG3D_Set_tetrahedron",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "v2",
     "kind": "iint"
    },
    {
     "name": "v3",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "set a single tetrahedron's vertices Assign the vertices \\a v0, \\a v1,\\a v2,\\a v3 and reference \\a ref to the tetrahedron at position \\a pos in the mesh structure. \\a pos ranges from 1 to nb_tetra included."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setTetrahedra",
   "c": "MMG3D_Set_tetrahedra",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "tetra",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all tetrahedra in a mesh structure This function sets the vertices and references of all tetrahedra in a mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setPrism",
   "c": "MMG3D_Set_prism",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "v2",
     "kind": "iint"
    },
    {
     "name": "v3",
     "kind": "iint"
    },
    {
     "name": "v4",
     "kind": "iint"
    },
    {
     "name": "v5",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the vertices and reference of a single prism in a mesh. This function sets the six vertices \\a v0, \\a v1,\\a v2,\\a v3,\\a v4,\\a v5 and reference \\a ref for the prism at position \\a pos in the mesh structure (from 1 to nb_prisms included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setPrisms",
   "c": "MMG3D_Set_prisms",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "prisms",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all prisms in a mesh. This function sets the vertices and references of all prisms in a mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setTriangle",
   "c": "MMG3D_Set_triangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "v2",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the vertices and reference of a single triangle in a mesh. This function defines a triangle of vertices \\a v0, \\a v1, \\a v2 and reference \\a ref at position \\a pos in mesh structure (from 1 to nb_triangle included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setTriangles",
   "c": "MMG3D_Set_triangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "tria",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all triangles in a mesh. This function sets the vertices and references of all triangles in a mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setQuadrilateral",
   "c": "MMG3D_Set_quadrilateral",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "v2",
     "kind": "iint"
    },
    {
     "name": "v3",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the vertices and reference of a single quadrilateral in a mesh. Set a quadrilateral of vertices \\a v0, \\a v1, \\a v2, \\a v3 and reference \\a ref at position \\a pos in mesh structure (from 1 to nb_quadrangles included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setQuadrilaterals",
   "c": "MMG3D_Set_quadrilaterals",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "quads",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all quadrilaterals in a mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setEdge",
   "c": "MMG3D_Set_edge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the vertices and reference of a single edge in a mesh. Set edges of extremities \\a v0, \\a v1 and reference \\a ref at position \\a pos in mesh structure (from 1 to nb_edges included)"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setCorner",
   "c": "MMG3D_Set_corner",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"corner\" attribute to a vertex. Set the \"corner\" attribute at vertex \\a k. This affects how the vertex is treated during remeshing."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetCorner",
   "c": "MMG3D_Unset_corner",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"corner\" attribute from a vertex. Remove corner attribute from vertex \\a k (from 1 to the number of vertices included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setRequiredVertex",
   "c": "MMG3D_Set_requiredVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to a vertex. Set vertex \\a k as required (\\a k from 1 to nb_vertices included). This prevents the remesher from moving the vertex."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetRequiredVertex",
   "c": "MMG3D_Unset_requiredVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove required attribute from a vertex. This function removes the required attribute from vertex \\a k."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setRequiredTetrahedron",
   "c": "MMG3D_Set_requiredTetrahedron",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to a tetrahedron. Set element \\a k as required (\\a k from 1 to nb_tetra included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetRequiredTetrahedron",
   "c": "MMG3D_Unset_requiredTetrahedron",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from a tetrahedron. Remove required attribute from element \\a k (\\a k from 1 to nb_tetra included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setRequiredTetrahedra",
   "c": "MMG3D_Set_requiredTetrahedra",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "reqIdx",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "nreq",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to multiple tetrahedra. Determine which tetrahedra have the \"required\" attribute."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetRequiredTetrahedra",
   "c": "MMG3D_Unset_requiredTetrahedra",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "reqIdx",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "nreq",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from multiple tetrahedra. Remove required attribute from a list of Tetra whose indices are contained in array \\a reqIdx."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setRequiredTriangle",
   "c": "MMG3D_Set_requiredTriangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to a single triangle. Set triangle \\a k as required (\\a k from 1 to nb_tria included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetRequiredTriangle",
   "c": "MMG3D_Unset_requiredTriangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from a single triangle. Remove required attribute from triangle \\a k."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setRequiredTriangles",
   "c": "MMG3D_Set_requiredTriangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "reqIdx",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "nreq",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to multiple triangles."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetRequiredTriangles",
   "c": "MMG3D_Unset_requiredTriangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "reqIdx",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "nreq",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from multiple triangles."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setParallelTriangle",
   "c": "MMG3D_Set_parallelTriangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"parallel\" attribute to a single triangle. Set triangle \\a k as parallel (triangle at the interface between two processors, ie, this triangle is required). (\\a k from 1 to nb_tria included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetParallelTriangle",
   "c": "MMG3D_Unset_parallelTriangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"parallel\" attribute from a single triangle. Remove parallel attribute from triangle \\a k (i.e. triangles aren't preserved anymore). (\\a k from 1 to nb_tria included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setParallelTriangles",
   "c": "MMG3D_Set_parallelTriangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "parIdx",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "npar",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"parallel\" attribute to multiple triangles. Set the parallel triangles (triangles at the interface between processors, i.e. these triangles are required)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetParallelTriangles",
   "c": "MMG3D_Unset_parallelTriangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "parIdx",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "npar",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"parallel\" attribute from multiple triangles. Remove parallel attributes from triangles (i.e. triangles aren't preserved anymore)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setRidge",
   "c": "MMG3D_Set_ridge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"ridge\" attribute to a single edge. Set the \"ridge\" attribute at edge \\a k. This affects how the remesher treats the edge and the adjacent triangles or tetrahedra."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetRidge",
   "c": "MMG3D_Unset_ridge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"ridge\" attribute from a single edge. Remove ridge attribute at edge \\a k."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setRequiredEdge",
   "c": "MMG3D_Set_requiredEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to a single edge. Set edge \\a k as required."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "unsetRequiredEdge",
   "c": "MMG3D_Unset_requiredEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from a single edge. Remove required attribute from edge \\a k."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setNormalAtVertex",
   "c": "MMG3D_Set_normalAtVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    },
    {
     "name": "n0",
     "kind": "idouble"
    },
    {
     "name": "n1",
     "kind": "idouble"
    },
    {
     "name": "n2",
     "kind": "idouble"
    }
   ],
   "doc": "Set the normal orientation at a single vertex. Set normal (n0,n1,n2) at vertex \\a k."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setScalarSol",
   "c": "MMG3D_Set_scalarSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "kind": "idouble"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single element of a scalar solution structure. Set scalar value \\a s at position \\a pos in solution structure (pos from 1 to nb_vertices included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setScalarSols",
   "c": "MMG3D_Set_scalarSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set the values of all elements of a scalar solution structure. Set scalar solutions at mesh vertices."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setVectorSol",
   "c": "MMG3D_Set_vectorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "vx",
     "kind": "idouble"
    },
    {
     "name": "vy",
     "kind": "idouble"
    },
    {
     "name": "vz",
     "kind": "idouble"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single element of a vector solution structure. Set vectorial value \\f$(v_x,v_y,v_z)\\f$ at position \\a pos in solution structure. (pos from 1 to nb_vertices included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setVectorSols",
   "c": "MMG3D_Set_vectorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all elements of a vector solution structure. Set vectorial solutions at mesh vertices"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setTensorSol",
   "c": "MMG3D_Set_tensorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "m11",
     "kind": "idouble"
    },
    {
     "name": "m12",
     "kind": "idouble"
    },
    {
     "name": "m13",
     "kind": "idouble"
    },
    {
     "name": "m22",
     "kind": "idouble"
    },
    {
     "name": "m23",
     "kind": "idouble"
    },
    {
     "name": "m33",
     "kind": "idouble"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single element of a tensor solution structure. Set tensorial values at position \\a pos in solution structure. (pos from 1 to nb_vertices included)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setTensorSols",
   "c": "MMG3D_Set_tensorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all elements of a tensor solution structure. Set tensorial values by array."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setIthSolInSolsAtVertices",
   "c": "MMG3D_Set_ithSol_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "iarraydouble",
     "nullable": false
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single element of one out of multiple solution fields that are defined on vertices. Set values of the solution at the ith field of the solution array and at position \\a pos (\\a pos from 1 to \\a nb_vertices included and \\a i from 1 to \\a nb_sols)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setIthSolsInSolsAtVertices",
   "c": "MMG3D_Set_ithSols_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all elements of one out of multiple solution fields that are defined on vertices. Set values of the ith field of the solution array by array (\\a i from 1 to \\a nb_sols)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setHandGivenMesh",
   "c": "MMG3D_Set_handGivenMesh",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Finish providing mesh data without using the API functions. To mark as ended a mesh given without using the API functions (for example, mesh given by mesh->point[i] = 0 ...). This function performs verifications, e.g. to make sure that all tetrahedra are consistently oriented."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "chkMeshData",
   "c": "MMG3D_Chk_meshData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Check if the number of given entities match with mesh and sol size Check if the number of given entities match with mesh and sol size (not mandatory) and check mesh datas."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setIparameter",
   "c": "MMG3D_Set_iparameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "iparam",
     "kind": "iint"
    },
    {
     "name": "val",
     "kind": "iint"
    }
   ],
   "doc": "set an integer parameter of the remesher This function sets the integer parameter \\a iparam to value \\a val."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setDparameter",
   "c": "MMG3D_Set_dparameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "dparam",
     "kind": "iint"
    },
    {
     "name": "val",
     "kind": "idouble"
    }
   ],
   "doc": "set a real-valued parameter of the remesher This function sets the double parameter \\a dparam to value \\a val."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setLocalParameter",
   "c": "MMG3D_Set_localParameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "typ",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "hmin",
     "kind": "idouble"
    },
    {
     "name": "hmax",
     "kind": "idouble"
    },
    {
     "name": "hausd",
     "kind": "idouble"
    }
   ],
   "doc": "set a local parameter Set local parameters: set the Hausdorff distance, minimum edge length, and maximum edge length for all entities of type \\a typ and reference \\a ref."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setMultiMat",
   "c": "MMG3D_Set_multiMat",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "split",
     "kind": "iint"
    },
    {
     "name": "rmin",
     "kind": "iint"
    },
    {
     "name": "rplus",
     "kind": "iint"
    }
   ],
   "doc": "Set the reference mapping for the elements of reference \\a ref in level-set discretization mode. With this function you can determine which references will be given to the tetrahedra on both sides of the level set, after discretization. Negative and positive here refer to volumes where the function is smaller or larger, respectively, than the isovalue of the level set."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setLsBaseReference",
   "c": "MMG3D_Set_lsBaseReference",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "br",
     "kind": "iint"
    }
   ],
   "doc": "Set a new level-set base reference. Set a new level-set base reference of ref \\a br in LS discretization mode. Base references are boundary conditions to which implicit domains can be attached. All implicit volumes that are not attached to listed base references are deleted as spurious volumes by the \\a rmc option."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getMeshSize",
   "c": "MMG3D_Get_meshSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "np",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ne",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "nprism",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "nt",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "nquad",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "na",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "recover data */ /** Get the number of vertices, tetrahedra, prisms, triangles, quadrilaterals and edges of the mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getSolSize",
   "c": "MMG3D_Get_solSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "typEntity",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "np",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "typSol",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the number of elements, dimension, and type of a solution structure."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getSolsAtVerticesSize",
   "c": "MMG3D_Get_solsAtVerticesSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "nsols",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "nentities",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "typSol",
     "kind": "oarrayint",
     "output": true,
     "count": 100,
     "nullable": false
    }
   ],
   "doc": "Get the number of elements, type, and dimensions of several solutions defined on vertices."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getVertex",
   "c": "MMG3D_Get_vertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c1",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c2",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isCorner",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the coordinates \\a c0, \\a c1,\\a c2 and reference \\a ref of the next vertex of \\a mesh. This function retrieves the coordinates \\a c0, \\a c1,\\a c2 and reference \\a ref of the next vertex of a mesh. It is meant to be used in a loop over all vertices. When this function has been called as many times as there are vertices, the internal loop counter will be reset. To obtain data for a specific vertex, the \\ref MMG3D_GetByIdx_vertex function can be used instead."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getByIdxVertex",
   "c": "MMG3D_GetByIdx_vertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c1",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c2",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isCorner",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "idx",
     "kind": "iint"
    }
   ],
   "doc": "Get the coordinates and reference of a specific vertex in the mesh. Get coordinates \\a c0, \\a c1, \\a c2 and reference \\a ref of vertex \\a idx of mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getVertices",
   "c": "MMG3D_Get_vertices",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "vertices",
     "kind": "oarraydouble",
     "output": true,
     "per": 3,
     "countParam": "np",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": true
    },
    {
     "name": "areCorners",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": true
    }
   ],
   "doc": "Get the coordinates and references of all vertices in the mesh.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getTetrahedron",
   "c": "MMG3D_Get_tetrahedron",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v2",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v3",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices and reference of the next tetrahedron in the mesh. This function retrieves the vertices \\a v0, \\a v1, \\a v2, \\a v3 and reference \\a ref of the next tetrahedron of \\a mesh. It is meant to be called in a loop over all tetrahedra. When it has been called as many times as there are tetrahedra, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getTetrahedra",
   "c": "MMG3D_Get_tetrahedra",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "tetra",
     "kind": "oarrayint",
     "output": true,
     "per": 4,
     "countParam": "ne",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "ne",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "ne",
     "nullable": true
    }
   ],
   "doc": "Get the vertices and reference of all tetrahedra in the mesh.",
   "counts": [
    "ne"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getPrism",
   "c": "MMG3D_Get_prism",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v2",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v3",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v4",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v5",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices and reference of the next prism in the mesh. This function retrieves the vertices \\a v0, \\a v1, \\a v2, \\a v3, \\a v4, \\a v5 and reference \\a ref of the next prism of \\a mesh. It is meant to be called in a loop over all prisms. When it has been called as many times as there are prisms, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getPrisms",
   "c": "MMG3D_Get_prisms",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "prisms",
     "kind": "oarrayint",
     "output": true,
     "per": 6,
     "countParam": "nprism",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nprism",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nprism",
     "nullable": true
    }
   ],
   "doc": "Get the vertices and references of all prisms in the mesh.",
   "counts": [
    "nprism"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getTriangle",
   "c": "MMG3D_Get_triangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v2",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices and reference of the next triangle in the mesh. This function retrieves the vertices \\a v0, \\a v1, \\a v2, and reference \\a ref of the next triangle of \\a mesh. It is meant to be called in a loop over all triangles. When it has been called as many times as there are triangles, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getTriangles",
   "c": "MMG3D_Get_triangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "tria",
     "kind": "oarrayint",
     "output": true,
     "per": 3,
     "countParam": "nt",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nt",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nt",
     "nullable": true
    }
   ],
   "doc": "Get the vertices and references of all triangles in the mesh.",
   "counts": [
    "nt"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getQuadrilateral",
   "c": "MMG3D_Get_quadrilateral",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v2",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v3",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices and reference of the next quadrilateral of the mesh. Get the vertices \\a v0,\\a v1,\\a v2,\\a v3 and reference \\a ref of the next quadrilateral of mesh. This function is meant to be called in a loop over all quadrilaterals. When it has been called as many times as there are quadrilaterals, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getQuadrilaterals",
   "c": "MMG3D_Get_quadrilaterals",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "quads",
     "kind": "oarrayint",
     "output": true,
     "per": 4,
     "countParam": "nquad",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nquad",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nquad",
     "nullable": true
    }
   ],
   "doc": "Get the vertices and references of all quadrilaterals of the mesh.",
   "counts": [
    "nquad"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getEdge",
   "c": "MMG3D_Get_edge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "e0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "e1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRidge",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices and reference of the next edge in the mesh. This function retrieves the extremities \\a e0, \\a e1 and reference \\a ref of next edge of \\a mesh. It is meant to be called in a loop over all edges. When it has been called as many times as there are edges in the mesh, the internal edge counter will be reset."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setEdges",
   "c": "MMG3D_Set_edges",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "edges",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all edges in a mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getEdges",
   "c": "MMG3D_Get_edges",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "edges",
     "kind": "oarrayint",
     "output": true,
     "per": 2,
     "countParam": "na",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "na",
     "nullable": true
    },
    {
     "name": "areRidges",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "na",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "na",
     "nullable": true
    }
   ],
   "doc": "Get the vertices and references of all edges in a mesh.",
   "counts": [
    "na"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getNormalAtVertex",
   "c": "MMG3D_Get_normalAtVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    },
    {
     "name": "n0",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "n1",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "n2",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the normal orientation at a single mesh vertex. This function retrieves the normal (n0,n1,n2) at vertex \\a k."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getTetrahedronQuality",
   "c": "MMG3D_Get_tetrahedronQuality",
   "ret": "double",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Get the quality measure of a single tetrahedron in the mesh. This function returns the quality measure of tetrahedron \\a k. Quality values range from 0 (degenerate) to 1 (best attainable). The function returns 0 if the tetrahedron is flat or has a negative volume, and also if \\a k is out of range. In the latter case it will also print a diagnostic message to standard output."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getScalarSol",
   "c": "MMG3D_Get_scalarSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the next element of a scalar solution structure defined at vertices. This function retrieves the solution \\a s of the next vertex of \\a mesh. It is meant to be called in a loop over all vertices. When it has been called as many times as there are vertices in the mesh, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getScalarSols",
   "c": "MMG3D_Get_scalarSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "kind": "oarraydouble",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": false
    }
   ],
   "doc": "Get all elements of a scalar solution structure defined at vertices.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getVectorSol",
   "c": "MMG3D_Get_vectorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "vx",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "vy",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "vz",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the next element of a vector solution structure. This function retrieves the next vector-valued element \\f$(v_x,v_y,vz)\\f$ of the solution. It is meant to be called in a loop over all elements. When it has been called as many times as there are elements in the solution, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getVectorSols",
   "c": "MMG3D_Get_vectorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "oarraydouble",
     "output": true,
     "per": 3,
     "countParam": "np",
     "nullable": false
    }
   ],
   "doc": "Get all elements of a vector solution structure. Get vectorial solutions at mesh vertices",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getTensorSol",
   "c": "MMG3D_Get_tensorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "m11",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m12",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m13",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m22",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m23",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m33",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the next element of a tensor solution structure. This function retrieves the next element \\f$(m_{11},m_{12},m_{13},m_{22},m_{23},m_{33})\\f$ of a tensor-valued solution field. It is meant to be called in a loop over all vertices. When it has been called as many times as there are elements in the solution, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getTensorSols",
   "c": "MMG3D_Get_tensorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "oarraydouble",
     "output": true,
     "per": 6,
     "countParam": "np",
     "nullable": false
    }
   ],
   "doc": "Get all elements of a tensor solution field.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getIthSolInSolsAtVertices",
   "c": "MMG3D_Get_ithSol_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "oarraydouble",
     "output": true,
     "per": 1,
     "countParam": "n",
     "nullable": false
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Get one out of several solutions at a specific vertex. Get values of the ith field of the solution array at vertex \\a pos. (pos from 1 to nb_vertices included and \\a i from 1 to \\a nb_sols). The type of solution is inferred from \\a sol.",
   "counts": [
    "n"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getIthSolsInSolsAtVertices",
   "c": "MMG3D_Get_ithSols_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "oarraydouble",
     "output": true,
     "per": 1,
     "countParam": "n",
     "nullable": false
    }
   ],
   "doc": "Get one out of several solutions at all vertices in the mesh. This function retrieves the values of the solution at the ith field of the solution array (\\a i from 1 to \\a nb_sols).",
   "counts": [
    "n"
   ]
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getIparameter",
   "c": "MMG3D_Get_iparameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "iparam",
     "kind": "iint"
    }
   ],
   "doc": "Get the value of an integer parameter of the remesher. Get the value of integer parameter \\a iparam."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "addTetrahedron",
   "c": "MMG3D_Add_tetrahedron",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "v2",
     "kind": "iint"
    },
    {
     "name": "v3",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    }
   ],
   "doc": "Add a tetrahedron to the mesh. This function adds a tetrahedron with vertices \\a v0, \\a v1, \\a v2, \\a v3 and reference \\a ref at the first available position of the mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "addVertex",
   "c": "MMG3D_Add_vertex",
   "ret": "int",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "kind": "idouble"
    },
    {
     "name": "c1",
     "kind": "idouble"
    },
    {
     "name": "c2",
     "kind": "idouble"
    },
    {
     "name": "ref",
     "kind": "iint"
    }
   ],
   "doc": "Add a vertex to the mesh. This function adds a vertex with coordinates \\a c0 \\a c1 \\a c2 and reference \\a ref at the first available position of the mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadMesh",
   "c": "MMG3D_loadMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh (in .mesh/.mesb format) from file. Read mesh data."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadMshMesh",
   "c": "MMG3D_loadMshMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly a solution in .msh format from file. This function reads a mesh and 0 or 1 data fields in MSH file format (.msh extension). We read only low-order vertices, edges, triangles, quadrangles, tetrahedra and prisms."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadVtuMesh",
   "c": "MMG3D_loadVtuMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly a solution in VTU (VTK) format from file. This function reads a mesh and 0 or 1 data field in VTU (VTK) file format (.vtu extension). We read only low-order vertices, edges, tria, quadra, tetra and prisms. Point and cell references must be stored in PointData or CellData whose names contain the \"medit:ref\" keyword."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadVtuMeshAndAllData",
   "c": "MMG3D_loadVtuMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and multiple solutions in VTU (VTK) format from file. This functionreads a mesh and a list of data in VTU file format (.vtu extension). We read only low-order vertices, edges, tria, quadra, tetra and prisms. Point and cell references must be stored in PointData or CellData whose names contains the \"medit:ref\" keyword."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadVtkMesh",
   "c": "MMG3D_loadVtkMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly a solution from a file in VTK format. This function reads a mesh and 0 or 1 data fields in VTK file format (.vtu extension). We read only low-order vertices, edges, tria, quadra, tetra and prisms. Point and cell references must be stored in PointData or CellData whose names contain the \"medit:ref\" keyword."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadVtkMeshAndAllData",
   "c": "MMG3D_loadVtkMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and multiple solutions from a file in VTK format. Read mesh and a list of data in VTK file format (.vtu extension). We read only low-order vertices, edges, tria, quadra, tetra and prisms. Point and cell references must be stored in PointData or CellData whose names contains the \"medit:ref\" keyword."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadMshMeshAndAllData",
   "c": "MMG3D_loadMshMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and all data from a file in MSH format. Read mesh and a list of data in MSH file format (.msh extension). We read only low-order vertices, edges, tria, quadra, tetra and prisms."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadGenericMesh",
   "c": "MMG3D_loadGenericMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Read mesh data in a format determined by the filename extension."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveMesh",
   "c": "MMG3D_saveMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh in .mesh/.meshb format."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveMshMesh",
   "c": "MMG3D_saveMshMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh in MSH format, ascii or binary depending on the filename extension. Write mesh and 0 or 1 data in MSH file format (.msh extension). Write binary file for .mshb extension and ASCII for .msh one."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveMshMeshAndAllData",
   "c": "MMG3D_saveMshMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and data in MSH format, ascii or binary depending on the filename extension. Write mesh and a list of data fields (that are considered as solutions and not metrics, thus, we do nothing over the ridge vertices) in MSH file format (.msh extension). Save file in ASCII format for .msh extension, in binary format for .mshb one."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveVtkMesh",
   "c": "MMG3D_saveVtkMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and optionally one solution in VTK format. Write mesh and 0 or 1 data in Vtk file format (.vtk extension)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveVtkMeshAndAllData",
   "c": "MMG3D_saveVtkMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and multiple data fields in VTK format. Write mesh and a list of data fields in Vtk file format (.vtk extension)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveVtuMesh",
   "c": "MMG3D_saveVtuMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and optionally one data field in VTU format. Write mesh and 0 or 1 data in vtu Vtk file format (.vtu extension)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveVtuMeshAndAllData",
   "c": "MMG3D_saveVtuMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and multiple data fields in VTU format. Write mesh and a list of data fields in vtu Vtk file format (.vtu extension)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveTetgenMesh",
   "c": "MMG3D_saveTetgenMesh",
   "ret": "status",
   "args": [
    {
     "name": "arg0",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "arg1",
     "kind": "istring"
    }
   ],
   "doc": "Save data in Tetgen's Triangle format. Save mesh data in Triangle (or equivalent to Tetgen in 3D) file format."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveGenericMesh",
   "c": "MMG3D_saveGenericMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save mesh data in a file whose format depends on the filename extension."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadSol",
   "c": "MMG3D_loadSol",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a metric field (or other solution). Load metric field. The solution file must contains only 1 solution: the metric"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "loadAllSols",
   "c": "MMG3D_loadAllSols",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load one or more solutions in a solution file in medit file format."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveSol",
   "c": "MMG3D_saveSol",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Write isotropic or anisotropic metric."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "saveAllSols",
   "c": "MMG3D_saveAllSols",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save 1 or more solutions in medit solution file format"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "freeAllSols",
   "c": "MMG3D_Free_allSols",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    }
   ],
   "doc": "Deallocate an array of solution fields"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "mmg3dlib",
   "c": "MMG3D_mmg3dlib",
   "ret": "libcode",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Main \"program\" for the mesh adaptation library."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "mmg3dls",
   "c": "MMG3D_mmg3dls",
   "ret": "libcode",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Main \"program\" for the level-set discretization library. Main program for the level-set discretization library. If a metric \\a met is provided, use it to adapt the mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "mmg3dmov",
   "c": "MMG3D_mmg3dmov",
   "ret": "libcode",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "disp",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Main program for the rigid-body movement library."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "defaultValues",
   "c": "MMG3D_defaultValues",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Tools for the library */ /** Print the default parameters values."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "parsar",
   "c": "MMG3D_parsar",
   "ret": "status",
   "args": [
    {
     "name": "argc",
     "kind": "iint"
    },
    {
     "name": "argv",
     "kind": null
    },
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Store command-line arguments.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "parsop",
   "c": "MMG3D_parsop",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Read a file containing Local parameters (.mmg3d extension) Read local parameters file. This file must have the same name as the mesh with the \\a .mmg3d extension or must be named \\a DEFAULT.mmg3d.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "usage",
   "c": "MMG3D_usage",
   "ret": "status",
   "args": [
    {
     "name": "prog",
     "kind": "istring"
    }
   ],
   "doc": "Print help for mmg3d options."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "stockOptions",
   "c": "MMG3D_stockOptions",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "info",
     "kind": null
    }
   ],
   "doc": "Store the info structure in the mesh structure.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "destockOptions",
   "c": "MMG3D_destockOptions",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "info",
     "kind": null
    }
   ],
   "doc": "Recover the info structure stored in the mesh structure.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "mmg3dcheck",
   "c": "MMG3D_mmg3dcheck",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "critmin",
     "kind": "idouble"
    },
    {
     "name": "lmin",
     "kind": "idouble"
    },
    {
     "name": "lmax",
     "kind": "idouble"
    },
    {
     "name": "eltab",
     "kind": null
    },
    {
     "name": "metRidTyp",
     "kind": "iint"
    }
   ],
   "doc": "Checks */ /** Search invalid elements (in term of quality or edge length) in a mesh.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "searchqua",
   "c": "MMG3D_searchqua",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "critmin",
     "kind": "idouble"
    },
    {
     "name": "eltab",
     "kind": null
    },
    {
     "name": "metRidTyp",
     "kind": "iint"
    }
   ],
   "doc": "List bad elements. Store elements which have worse quality than \\a critmin in \\a eltab, \\a eltab is allocated and could contain \\a mesh->ne elements.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "searchlen",
   "c": "MMG3D_searchlen",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "lmin",
     "kind": "idouble"
    },
    {
     "name": "lmax",
     "kind": "idouble"
    },
    {
     "name": "eltab",
     "kind": null
    },
    {
     "name": "metRidTyp",
     "kind": "iint"
    }
   ],
   "doc": "List edges that are too short or too long. Store in \\a eltab elements which have edge lengths shorter than \\a lmin or longer than \\a lmax, \\a eltab is allocated and could contain \\a mesh->ne elements.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getAdjaTet",
   "c": "MMG3D_Get_adjaTet",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "kel",
     "kind": "iint"
    },
    {
     "name": "listet",
     "count": 4,
     "output": true,
     "kind": "oarrayint"
    }
   ],
   "doc": "Utils */ /** Return adjacent elements of a tetrahedron. Find the indices of the 4 adjacent elements of tetrahedron \\a kel. \\f$listet[i] = 0\\f$ if the \\f$i^{th}\\f$ face has no adjacent element (so we are on a boundary face)."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "hashTetra",
   "c": "MMG3D_hashTetra",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "pack",
     "kind": "iint"
    }
   ],
   "doc": "Compute the length of an edge according to the size prescription. Compute the length of edge \\f$[ca,cb]\\f$ (with \\a ca and \\a cb coordinates of edge endpoints) according to the size prescription. / LIBMMG3D_EXPORT extern double (*MMG3D_lenedgCoor)(double *ca,double *cb,double *sa,double *sb); /** Create array of adjacency. Create array of adjacency. Set pack variable to 0 for a compact mesh and to 1 for a mesh that need to be packed."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setConstantSize",
   "c": "MMG3D_Set_constantSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Compute isotropic size map according to the mean of the length of the edges passing through a vertex. / LIBMMG3D_EXPORT extern int (*MMG3D_doSol)(MMG5_pMesh mesh,MMG5_pSol met); /** Compute a constant size map according to the hsiz, hmin and hmax parameters. This function computes a constant size map according to mesh->info.hsiz, mesh->info.hmin and mesh->info.hmax. It updates these 3 values if not compatible."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "switchMetricStorage",
   "c": "MMG3D_switch_metricStorage",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Swap the m22 and m23 values of the metric. Switch the m22 and m23 value of the metric to allow to pass from the API storage to the medit storage."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setfunc",
   "c": "MMG3D_setfunc",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "To associate function pointers without calling MMG3D_mmg3dlib */ /** Set function pointers for caltet, lenedg, lenedgCoor defsiz, gradsiz... depending if the metric that was read is anisotropic or isotropic"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getNumberOfNonBdyTriangles",
   "c": "MMG3D_Get_numberOfNonBdyTriangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "nb_tria",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the number of non-boundary triangles. Get the number of non-boundary triangles (for DG methods for example). A triangle is boundary if it is located at the interface of 2 domains with different references or if it belongs to one tetra only. Append these triangles to the list of triangles."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getNonBdyTriangle",
   "c": "MMG3D_Get_nonBdyTriangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v2",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "idx",
     "kind": "iint"
    }
   ],
   "doc": "Get vertices and reference of a non-boundary triangle. Get vertices and reference \\a ref of the idx^th non-boundary triangle (for DG methods for example). A tria is boundary if it is located at the interface of 2 domains with different references or if it belongs to one tetra only."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getTetFromTria",
   "c": "MMG3D_Get_tetFromTria",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "ktri",
     "kind": "iint"
    },
    {
     "name": "ktet",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "iface",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get a tetrahedron given one of its triangles and the index by which it refers to this triangle (DEPRECATED). Fill \\a ktet by the index of a tetrahedron to which belongs a boundary triangle and \\a iface by the index of the triangle in the tetra."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "getTetsFromTria",
   "c": "MMG3D_Get_tetsFromTria",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "ktri",
     "kind": "iint"
    },
    {
     "name": "ktet",
     "count": 2,
     "output": true,
     "kind": "oarrayint"
    },
    {
     "name": "iface",
     "count": 2,
     "output": true,
     "kind": "oarrayint"
    }
   ],
   "doc": "Get two tetrahedra given a triangle and face indices. Fill \\a ktet by the indices of the tetrahedra that have a boundary triangle and \\a iface by the indices of the faces of the tetras that correspond to the triangle. Fill ktet[1] and iface[1] by 0 if the triangle belongs to 1 tetrahedron only."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "computeEigenv",
   "c": "MMG3D_Compute_eigenv",
   "ret": "int",
   "args": [
    {
     "name": "m",
     "kind": "iarraydouble",
     "nullable": false,
     "count": 6
    },
    {
     "name": "lambda",
     "kind": "oarraydouble",
     "output": true,
     "count": 3,
     "nullable": false
    },
    {
     "name": "vp",
     "kind": "oarraydouble",
     "output": true,
     "count": 9,
     "nullable": false
    }
   ],
   "doc": "Compute the real eigenvalues and eigenvectors of a symmetric matrix Compute the real eigenvalues and eigenvectors of a symmetric matrix m whose upper part is provided (m11, m12, m13, m22, m23, m33 in this order). lambda[0] is the eigenvalue associated to the eigenvector ( v[0][0], v[0,1], v[0,2] ) in C and to the eigenvector v(1,:) in fortran lambda[1] is the eigenvalue associated to the eigenvector ( v[1][0], v[1,1], v[1,2] ) in C and to the eigenvector v(2,:) in fortran lambda[2] is the eigenvalue associated to the eigenvector ( v[2][0], v[2,1], v[2,2] ) in C and to the eigenvector v(3,:) in fortran"
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "cleanIsoSurf",
   "c": "MMG3D_Clean_isoSurf",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Clean data (triangles and edges) linked to isosurface."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "freeSolutions",
   "c": "MMG3D_Free_solutions",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Free the solution structure of a given mesh."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "setCommonFunc",
   "c": "MMG3D_Set_commonFunc",
   "ret": "void",
   "args": [],
   "doc": "Set common pointer functions between mmgs and mmg3d to the matching mmg3d functions."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "initFileNames",
   "c": "MMG2D_Init_fileNames",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Initialize file names to their default values."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "initParameters",
   "c": "MMG2D_Init_parameters",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Initialize the input parameters (stored in the Info structure)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setInputMeshName",
   "c": "MMG2D_Set_inputMeshName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "meshin",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the input mesh."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setOutputMeshName",
   "c": "MMG2D_Set_outputMeshName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "meshout",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the output mesh file."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setInputSolName",
   "c": "MMG2D_Set_inputSolName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "solin",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the input solution file."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setOutputSolName",
   "c": "MMG2D_Set_outputSolName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "solout",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the output solution file."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setInputParamName",
   "c": "MMG2D_Set_inputParamName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "fparamin",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the input parameter file."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setIparameter",
   "c": "MMG2D_Set_iparameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "iparam",
     "kind": "iint"
    },
    {
     "name": "val",
     "kind": "iint"
    }
   ],
   "doc": "Set integer parameter \\a iparam to value \\a val."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setDparameter",
   "c": "MMG2D_Set_dparameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "dparam",
     "kind": "iint"
    },
    {
     "name": "val",
     "kind": "idouble"
    }
   ],
   "doc": "Set double parameter \\a dparam to value \\a val."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setLocalParameter",
   "c": "MMG2D_Set_localParameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "typ",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "hmin",
     "kind": "idouble"
    },
    {
     "name": "hmax",
     "kind": "idouble"
    },
    {
     "name": "hausd",
     "kind": "idouble"
    }
   ],
   "doc": "Set local parameters. Set local parameters: set the Hausdorff distance, minimal desired edge length, and maximal desired edge length for all entities of type \\a typ and reference \\a ref."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setMultiMat",
   "c": "MMG2D_Set_multiMat",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "split",
     "kind": "iint"
    },
    {
     "name": "rmin",
     "kind": "iint"
    },
    {
     "name": "rplus",
     "kind": "iint"
    }
   ],
   "doc": "Set the reference mapping for the elements of ref \\a ref in LS discretization mode. With this function you can determine which references will be given to the triangles on both sides of the level set, after discretization. Negative and positive here refer to areas where the function is smaller or larger, respectively, than the isovalue of the level set."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setLsBaseReference",
   "c": "MMG2D_Set_lsBaseReference",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "br",
     "kind": "iint"
    }
   ],
   "doc": "Set level-set base reference. Set a new level-set base reference of ref \\a br in ls discretization mode. Based references are boundary conditions to which implicit domain can be attached. All implicit volumes that are not attached to listed base references are deleted as spurious volumes by the \\a rmc option."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setMeshSize",
   "c": "MMG2D_Set_meshSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "np",
     "kind": "iint"
    },
    {
     "name": "nt",
     "kind": "iint"
    },
    {
     "name": "nquad",
     "kind": "iint"
    },
    {
     "name": "na",
     "kind": "iint"
    }
   ],
   "doc": "Set the numbers of entities in the mesh. Set the number of vertices, triangles, quadrangles and edges of the mesh and allocate the associated tables. If call twice, reset the whole mesh to realloc it at the new size"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setSolSize",
   "c": "MMG2D_Set_solSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "typEntity",
     "kind": "iint"
    },
    {
     "name": "np",
     "kind": "iint"
    },
    {
     "name": "typSol",
     "kind": "iint"
    }
   ],
   "doc": "Set the size and type of a solution field. Initialize an array of solution field: set dimension, types and number of data. To use to initialize an array of solution fields (not used by Mmg itself)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setSolsAtVerticesSize",
   "c": "MMG2D_Set_solsAtVerticesSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "nsols",
     "kind": "iint"
    },
    {
     "name": "nentities",
     "kind": "iint"
    },
    {
     "name": "typSol",
     "kind": "iarrayint",
     "nullable": false
    }
   ],
   "doc": "Initialize an array of solutions field defined at vertices Initialize an array of solutions field defined at vertices: set dimension, types and number of data. To use to initialize an array of solution fields (not used by Mmg itself)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setVertex",
   "c": "MMG2D_Set_vertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "kind": "idouble"
    },
    {
     "name": "c1",
     "kind": "idouble"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the coordinates and reference of a single vertex. Set vertex of coordinates \\a c0, \\a c1 and reference \\a ref at position \\a pos in mesh structure (from 1 to nb_vertices included)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setVertices",
   "c": "MMG2D_Set_vertices",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "vertices",
     "kind": "iarraydouble",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the coordinates and references of all vertices in the mesh."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setCorner",
   "c": "MMG2D_Set_corner",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"corner\" attribute to a vertex. Set the \"corner\" attribute at vertex \\a k. This affects how the vertex is treated during remeshing."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "unsetCorner",
   "c": "MMG2D_Unset_corner",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"corner\" attribute from a vertex. Remove corner attribute from vertex \\a k (from 1 to the number of vertices included)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setRequiredVertex",
   "c": "MMG2D_Set_requiredVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to a vertex. Set vertex \\a k as required (\\a k from 1 to the number of vertices included). This prevents the remesher from moving the vertex."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "unsetRequiredVertex",
   "c": "MMG2D_Unset_requiredVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from a vertex. This function removes the \"required\" attribute from vertex \\a k."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setTriangle",
   "c": "MMG2D_Set_triangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "v2",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the vertices and reference of a single triangle in a mesh. This function defines a triangle with vertices \\a v0, \\a v1, \\a v2 and reference \\a ref at position \\a pos in mesh structure (from 1 to the number of triangles included)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setTriangles",
   "c": "MMG2D_Set_triangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "tria",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all triangles in a mesh. This function sets the vertices and references of all triangles in a mesh."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setRequiredTriangle",
   "c": "MMG2D_Set_requiredTriangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Give triangle \\a k the \"required\" attribute."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "unsetRequiredTriangle",
   "c": "MMG2D_Unset_requiredTriangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from triangle \\a k."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setQuadrilateral",
   "c": "MMG2D_Set_quadrilateral",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "v2",
     "kind": "iint"
    },
    {
     "name": "v3",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the vertices and reference of a single quadrangle in a mesh. Define a quadrangle with vertices \\a v0, \\a v1,\\a v2,\\a v3 and reference \\a ref at position \\a pos in mesh structure (from 1 to nb_quad included)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setQuadrilaterals",
   "c": "MMG2D_Set_quadrilaterals",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "quadra",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all quadrangles in a mesh."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setEdge",
   "c": "MMG2D_Set_edge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Define a single edge. Define an edge with vertices \\a v0, \\a v1 and reference \\a ref at position \\a pos in the mesh structure (\\a pos from 1 to the number of edges included)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setEdges",
   "c": "MMG2D_Set_edges",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "edges",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all edges in a mesh."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setRequiredEdge",
   "c": "MMG2D_Set_requiredEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Give edge \\a k the \"required\" attribute."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "unsetRequiredEdge",
   "c": "MMG2D_Unset_requiredEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from edge \\a k."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setParallelEdge",
   "c": "MMG2D_Set_parallelEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Give edge \\a k the \"parallel\" attribute."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setScalarSol",
   "c": "MMG2D_Set_scalarSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "kind": "idouble"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single value of a sol structure. Set scalar value \\a s at position \\a pos in solution structure. (pos from 1 to nb_vertices included)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setScalarSols",
   "c": "MMG2D_Set_scalarSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all values of a scalar sol structure."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setVectorSol",
   "c": "MMG2D_Set_vectorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "vx",
     "kind": "idouble"
    },
    {
     "name": "vy",
     "kind": "idouble"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single vector value in a sol structure. Set vectorial value \\f$(v_x,v_y)\\f$ at position \\a pos in solution structure. ( pos from 1 to nb_vertices included)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setVectorSols",
   "c": "MMG2D_Set_vectorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all values in a vector sol structure. Set vectorial solutions at mesh vertices"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setTensorSol",
   "c": "MMG2D_Set_tensorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "m11",
     "kind": "idouble"
    },
    {
     "name": "m12",
     "kind": "idouble"
    },
    {
     "name": "m22",
     "kind": "idouble"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single element of a tensor sol structure. Set tensor value \\a s at position \\a pos in solution structure (\\a pos from 1 to nb_vertices included)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setTensorSols",
   "c": "MMG2D_Set_tensorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all elements of a tensor sol structure. Set tensorial values at position \\a pos in solution structure."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setIthSolInSolsAtVertices",
   "c": "MMG2D_Set_ithSol_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "iarraydouble",
     "nullable": false
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single element of one out of multiple solution fields that are defined on vertices. Set values of the solution at the ith field of the solution array. (\\a pos from 1 to \\a nb_vertices included and \\a i from 1 to \\a nb_sols)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setIthSolsInSolsAtVertices",
   "c": "MMG2D_Set_ithSols_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all elements of one out of multiple solution fields that are defined on vertices. Set scalar values of the solution at the ith field of the solution array. (\\a i from 1 to \\a nb_sols)"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getMeshSize",
   "c": "MMG2D_Get_meshSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "np",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "nt",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "nquad",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "na",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "recover datas */ /** Get the number of vertices, triangles and edges of the mesh."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getSolSize",
   "c": "MMG2D_Get_solSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "typEntity",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "np",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "typSol",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the number of solutions, their dimension and their type."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getSolsAtVerticesSize",
   "c": "MMG2D_Get_solsAtVerticesSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "nsols",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "nentities",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "typSol",
     "kind": "oarrayint",
     "output": true,
     "count": 100,
     "nullable": false
    }
   ],
   "doc": "Get the number of elements and dimension of a solution defined on vertices."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getVertex",
   "c": "MMG2D_Get_vertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c1",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isCorner",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the coordinates and reference ref of the next vertex of a mesh. This function retrieves the coordinates \\a c0 and \\a c1, and reference \\a ref of the next vertex of a mesh. It is meant to be used in a loop over all vertices. When this function has been called as many times as there are vertices, the internal loop counter will be reset. To obtain data for a specific vertex, the \\ref MMG2D_GetByIdx_vertex function can be used instead."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getByIdxVertex",
   "c": "MMG2D_GetByIdx_vertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c1",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isCorner",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "idx",
     "kind": "iint"
    }
   ],
   "doc": "Get the coordinates and reference of a specific vertex in the mesh. Get coordinates \\a c0, \\a c1 and reference \\a ref of vertex \\a idx of mesh."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getVertices",
   "c": "MMG2D_Get_vertices",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "vertices",
     "kind": "oarraydouble",
     "output": true,
     "per": 2,
     "countParam": "np",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": true
    },
    {
     "name": "areCorners",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": true
    }
   ],
   "doc": "Get the coordinates and references of all vertices in the mesh.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getTriangle",
   "c": "MMG2D_Get_triangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v2",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices and reference of the next triangle in the mesh. This function retrieves the vertices \\a v0, \\a v1, \\a v2, and reference \\a ref of the next triangle of \\a mesh. It is meant to be called in a loop over all triangles. When it has been called as many times as there are triangles, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getTriangles",
   "c": "MMG2D_Get_triangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "tria",
     "kind": "oarrayint",
     "output": true,
     "per": 3,
     "countParam": "nt",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nt",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nt",
     "nullable": true
    }
   ],
   "doc": "Get the vertices and references of all triangles in the mesh.",
   "counts": [
    "nt"
   ]
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getQuadrilateral",
   "c": "MMG2D_Get_quadrilateral",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v2",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v3",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices and reference of the next quadrangle of the mesh. Get the vertices \\a v0,\\a v1,\\a v2,\\a v3 and reference \\a ref of the next quadrangle of mesh. This function is meant to be called in a loop over all quadrangles. When it has been called as many times as there are quadrangles, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getQuadrilaterals",
   "c": "MMG2D_Get_quadrilaterals",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "quadra",
     "kind": "oarrayint",
     "output": true,
     "per": 4,
     "countParam": "nquad",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nquad",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nquad",
     "nullable": true
    }
   ],
   "doc": "Get the vertices and references of all quadrangles of the mesh.",
   "counts": [
    "nquad"
   ]
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getEdge",
   "c": "MMG2D_Get_edge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "e0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "e1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRidge",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices and reference of the next edge in the mesh. This function retrieves the extremities \\a e0, \\a e1 and reference \\a ref of next edge of \\a mesh. It is meant to be called in a loop over all edges. When it has been called as many times as there are edges in the mesh, the internal edge counter will be reset."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getEdges",
   "c": "MMG2D_Get_edges",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "edges",
     "kind": "oarrayint",
     "output": true,
     "per": 2,
     "countParam": "na",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "na",
     "nullable": true
    },
    {
     "name": "areRidges",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "na",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "na",
     "nullable": true
    }
   ],
   "doc": "Get the vertices and references of all edges in a mesh.",
   "counts": [
    "na"
   ]
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getTriangleQuality",
   "c": "MMG2D_Get_triangleQuality",
   "ret": "double",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Get the quality measure of a single triangle in the mesh. Get quality of triangle \\a k."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getScalarSol",
   "c": "MMG2D_Get_scalarSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the scalar solution value \\a s of next element of a solution. This function is meant to be called in a loop over all elements. When it has been called as many times as there are elements in the solution, the internal counter will be reset."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getScalarSols",
   "c": "MMG2D_Get_scalarSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "kind": "oarraydouble",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": false
    }
   ],
   "doc": "Get all elements of a scalar sol structure.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getVectorSol",
   "c": "MMG2D_Get_vectorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "vx",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "vy",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the next element of a vector sol structure. This function retrieves vectorial solution \\f$(v_x,v_y)\\f$ of the next element of \\a met. It is meant to be called in a loop over all elements. When it has been called as many times as there are elements in the solution, the internal counter will be reset."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getVectorSols",
   "c": "MMG2D_Get_vectorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "oarraydouble",
     "output": true,
     "per": 2,
     "countParam": "np",
     "nullable": false
    }
   ],
   "doc": "Get all elements of a vector sol structure.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getTensorSol",
   "c": "MMG2D_Get_tensorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "m11",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m12",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m22",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the next element of a tensor sol structure. This function is meant to be called in a loop over all elements. When it has been called as many times as there are elements in the solution, the internal counter will be reset."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getTensorSols",
   "c": "MMG2D_Get_tensorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "oarraydouble",
     "output": true,
     "per": 3,
     "countParam": "np",
     "nullable": false
    }
   ],
   "doc": "Get all elements of a tensor sol structure.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getIthSolInSolsAtVertices",
   "c": "MMG2D_Get_ithSol_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "oarraydouble",
     "output": true,
     "per": 1,
     "countParam": "n",
     "nullable": false
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Get one out of several scalar solutions at a specific vertex. Get values of the ith field of the solution array at vertex \\a pos. (pos from 1 to the number of vertices included and \\a i from 1 to the number of solutions).",
   "counts": [
    "n"
   ]
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getIthSolsInSolsAtVertices",
   "c": "MMG2D_Get_ithSols_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "oarraydouble",
     "output": true,
     "per": 1,
     "countParam": "n",
     "nullable": false
    }
   ],
   "doc": "Get one out of several scalar solutions at all vertices in the mesh. Get values of the solution at the ith field of the solution array. (\\a i from 1 to \\a nb_sols)",
   "counts": [
    "n"
   ]
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "chkMeshData",
   "c": "MMG2D_Chk_meshData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Check if the number of given entities match with mesh and sol size Check if the number of given entities match with mesh and sol size (not mandatory) and check mesh datas."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "freeAllSols",
   "c": "MMG2D_Free_allSols",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    }
   ],
   "doc": "Deallocate an array of solution fields"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadMesh",
   "c": "MMG2D_loadMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh (in .mesh/.mesb format) from file."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadVtpMesh",
   "c": "MMG2D_loadVtpMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly a solution in VTP (VTK) format from file. Read a mesh and 0 or 1 data fields in VTK vtp file format (.vtp extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadVtpMeshAndAllData",
   "c": "MMG2D_loadVtpMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and multiple solutions in VTP (VTK) format from file. Read a mesh and a list of data fields in VTK vtp file format (.vtp extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadVtuMesh",
   "c": "MMG2D_loadVtuMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly data in VTU (VTK) format from file. Read a mesh and 0 or 1 data fields in VTK vtu file format (.vtu extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadVtuMeshAndAllData",
   "c": "MMG2D_loadVtuMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and multiple solutions in VTU (VTK) format from file. Read a mesh and a list of data fields in VTK vtu file format (.vtu extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadVtkMesh",
   "c": "MMG2D_loadVtkMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly data in VTK format from file. Read mesh and 0 or 1 data fields in VTK file format (.vtk extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadVtkMeshAndAllData",
   "c": "MMG2D_loadVtkMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and multiple solutions in VTK format from file. This function reads a mesh and a list of data fields in VTK file format (.vtk extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadMshMesh",
   "c": "MMG2D_loadMshMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly a solution in .msh format from file. This function reads a mesh and 0 or 1 data fields in MSH file format (.msh extension). We read only low-order vertices, edges, triangles, and quadrangles."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadMshMeshAndAllData",
   "c": "MMG2D_loadMshMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and all data from a file in MSH format. This function reads a mesh and all data fields from a file in MSH file format (.msh extension). We read only low-order vertices, edges, triangles, quadrangles, tetrahedra and prisms."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadSol",
   "c": "MMG2D_loadSol",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a metric field (or other solution) in medit's .sol format. This function loads a metric field. The file in medit format must contain 1 solution: the metric."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadGenericMesh",
   "c": "MMG2D_loadGenericMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Read mesh data in a format determined by the filename extension."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadAllSols",
   "c": "MMG2D_loadAllSols",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load one or more solutions in a solution file in medit file format. Load 1 or more solutions in a solution file in medit file format"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "loadVect",
   "c": "MMG2D_loadVect",
   "ret": "status",
   "args": [
    {
     "name": "arg0",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "arg1",
     "kind": "istring"
    }
   ],
   "doc": "",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveMesh",
   "c": "MMG2D_saveMesh",
   "ret": "status",
   "args": [
    {
     "name": "arg0",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "arg1",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh in .mesh/.meshb format."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveMshMesh",
   "c": "MMG2D_saveMshMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and optionally one data field in MSH format, ascii or binary depending on the filename extension. This function writes a mesh and optionally one data field in MSH file format (.msh extension). It uses ASCII format for .msh extension, binary format for .msb extension."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveMshMeshAndAllData",
   "c": "MMG2D_saveMshMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and multiple data fields in MSH format, ascii or binary depending on the filename extension. This function writes a mesh and a list of data fields in MSH file format (.msh extension). It uses ASCII format for .msh extension, binary format for .mshb extension."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveVtkMesh",
   "c": "MMG2D_saveVtkMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and optionally one solution in VTK format. This function writes a mesh and 0 or 1 data fields in Vtk file format (.vtk extension)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveVtkMeshAndAllData",
   "c": "MMG2D_saveVtkMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and multiple data fields in VTK format. This function writes a mesh and a list of data fields in Vtk file format (.vtk extension)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveVtuMesh",
   "c": "MMG2D_saveVtuMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and optionally one data field in VTU format. This function writes a mesh and 0 or 1 data fields in vtu Vtk file format (.vtu extension)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveVtuMeshAndAllData",
   "c": "MMG2D_saveVtuMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and multiple data fields in VTU format. This function writes a mesh and a list of data fields in vtu Vtk file format (.vtu extension)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveVtpMesh",
   "c": "MMG2D_saveVtpMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and optionally one data field in VTP format. This function writes a mesh and optionally one data field in polydata Vtk file format (.vtp extension)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveVtpMeshAndAllData",
   "c": "MMG2D_saveVtpMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and multiple data fields in VTP format. This function writes a mesh and a list of data fields in polydata Vtk file format (.vtp extension)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveTetgenMesh",
   "c": "MMG2D_saveTetgenMesh",
   "ret": "status",
   "args": [
    {
     "name": "arg0",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "arg1",
     "kind": "istring"
    }
   ],
   "doc": "Save data in Tetgen's Triangle format. This function saves mesh data in Triangle (or equivalent to Tetgen in 2D) file format."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveGenericMesh",
   "c": "MMG2D_saveGenericMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save mesh data in a file whose format depends on the filename extension."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveSol",
   "c": "MMG2D_saveSol",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save metric field in medit solution file format."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveAllSols",
   "c": "MMG2D_saveAllSols",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save one or more solutions in a solution file in medit file format."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "saveVect",
   "c": "MMG2D_saveVect",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    },
    {
     "name": "lambda",
     "kind": "idouble"
    }
   ],
   "doc": "",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "mmg2dlib",
   "c": "MMG2D_mmg2dlib",
   "ret": "libcode",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Main \"program\" for the mesh adaptation library. This function adapts a given mesh, trying to improve the quality, under the given metric and parameters."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "mmg2dmesh",
   "c": "MMG2D_mmg2dmesh",
   "ret": "libcode",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Main \"program\" for the mesh generation library. FIXME: This function creates a triangular mesh from a given polygon, right?"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "mmg2dls",
   "c": "MMG2D_mmg2dls",
   "ret": "libcode",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Main \"program\" for the level-set discretization library. This is the main program for the level-set discretization library. If a metric \\a met is provided, it is used to adapt the mesh."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "mmg2dmov",
   "c": "MMG2D_mmg2dmov",
   "ret": "libcode",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "disp",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Main \"program\" for the rigid-body movement library."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "defaultValues",
   "c": "MMG2D_defaultValues",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Print the default parameters values."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "parsar",
   "c": "MMG2D_parsar",
   "ret": "status",
   "args": [
    {
     "name": "argc",
     "kind": "iint"
    },
    {
     "name": "argv",
     "kind": null
    },
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Store command line arguments.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "parsop",
   "c": "MMG2D_parsop",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Read a file containing Local parameters (.mmg2d extension) This function reads a local parameters file. This file must have the same name as the mesh with the \\a .mmg2d extension or must be named \\a DEFAULT.mmg2d.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "usage",
   "c": "MMG2D_usage",
   "ret": "status",
   "args": [
    {
     "name": "prog",
     "kind": "istring"
    }
   ],
   "doc": "Print help for mmg2d options."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setConstantSize",
   "c": "MMG2D_Set_constantSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Compute unit tensor according to the lengths of the edges passing through a vertex. / LIBMMG2D_EXPORT extern int (*MMG2D_doSol)(MMG5_pMesh mesh ,MMG5_pSol met ); /** Compute a constant size map according to the hsiz, hmin and hmax parameters. This function computes a constant size map according to mesh->info.hsiz, mesh->info.hmin and mesh->info.hmax. It updates these 3 values if not compatible."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setfunc",
   "c": "MMG2D_setfunc",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Set function pointers for length, caltri... depending if case is iso or aniso"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getNumberOfNonBdyEdges",
   "c": "MMG2D_Get_numberOfNonBdyEdges",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "nb_edges",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the number of non-boundary edges. This function extracts the number of non boundary edges (for DG methods for example). An edge is boundary if it is located at the interface of two domains with different references, if it belongs to one triangle only or if it is a singular edge (ridge or required). Append these edges to the list of edges."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getNonBdyEdge",
   "c": "MMG2D_Get_nonBdyEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "e0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "e1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "idx",
     "kind": "iint"
    }
   ],
   "doc": "Get vertices and reference of a non-boundary edge. This function returns the extremities \\a e0, \\a e1 and reference \\a ref of the idx^th non boundary edge (for DG methods for example). An edge is boundary if it is located at the interface of 2 domains with different references, if it belongs to one triangle only or if it is a singular edge (ridge or required)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getAdjaTri",
   "c": "MMG2D_Get_adjaTri",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "kel",
     "kind": "iint"
    },
    {
     "name": "listri",
     "count": 3,
     "output": true,
     "kind": "oarrayint"
    }
   ],
   "doc": "Return adjacent elements of a triangle. Find the indices of the 3 adjacent elements of triangle \\a kel. \\f$v_i = 0\\f$ if the \\f$i^{th}\\f$ face has no adjacent element (so we are on a boundary face)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getAdjaVertices",
   "c": "MMG2D_Get_adjaVertices",
   "ret": "int",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "ip",
     "kind": "iint"
    },
    {
     "name": "lispoi",
     "count": 1024,
     "output": true,
     "kind": "oarrayint"
    }
   ],
   "doc": "Return adjacent vertices of a triangle. Find the indices of the adjacent vertices of the vertex \\a ip."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getAdjaVerticesFast",
   "c": "MMG2D_Get_adjaVerticesFast",
   "ret": "int",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "ip",
     "kind": "iint"
    },
    {
     "name": "start",
     "kind": "iint"
    },
    {
     "name": "lispoi",
     "count": 1024,
     "output": true,
     "kind": "oarrayint"
    }
   ],
   "doc": "Return adjacent vertices of a triangle. Find the indices of the adjacent vertices of the vertex \\a ip of the triangle \\a start."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getTriFromEdge",
   "c": "MMG2D_Get_triFromEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "ked",
     "kind": "iint"
    },
    {
     "name": "ktri",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ied",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Find a triangle given an adjacent triangle and an edge number. Fill \\a ktri by the index of the triangle to which belong a boundary edge and \\a ied by the index of the edge of the triangle that correspond to the edge."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "getTrisFromEdge",
   "c": "MMG2D_Get_trisFromEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "ked",
     "kind": "iint"
    },
    {
     "name": "ktri",
     "count": 2,
     "output": true,
     "kind": "oarrayint"
    },
    {
     "name": "ied",
     "count": 2,
     "output": true,
     "kind": "oarrayint"
    }
   ],
   "doc": "Find two triangles given the edge that they share. Fill \\a ktri by the indices of the triangles to which belong a boundary edge and \\a ied by the indices of the matching edge in each triangle. If \\a ked belongs to one triangle only, ktri[1] = ied[1] = 0."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "computeEigenv",
   "c": "MMG2D_Compute_eigenv",
   "ret": "int",
   "args": [
    {
     "name": "m",
     "kind": "iarraydouble",
     "nullable": false,
     "count": 3
    },
    {
     "name": "lambda",
     "kind": "oarraydouble",
     "output": true,
     "count": 2,
     "nullable": false
    },
    {
     "name": "vp",
     "kind": "oarraydouble",
     "output": true,
     "count": 4,
     "nullable": false
    }
   ],
   "doc": "Compute the real eigenvalues and eigenvectors of a symmetric matrix This function computes the real eigenvalues and eigenvectors of a symmetric matrix m whose upper part is provided (m11, m12, m22, in this order). lambda[0] is the eigenvalue associated to the eigenvector ( v[0][0], v[0,1] ) in C and to the eigenvector v(1,:) in fortran lambda[1] is the eigenvalue associated to the eigenvector ( v[1][0], v[1,1] ) in C and to the eigenvector v(2,:) in fortran"
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "resetVerticestags",
   "c": "MMG2D_Reset_verticestags",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Reset the vertex tags. This function resets the tags of all vertices. Be careful: all the tags are deleted."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "freeTriangles",
   "c": "MMG2D_Free_triangles",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Free the mesh elements (and the adjacency information)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "freeEdges",
   "c": "MMG2D_Free_edges",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Free the mesh edges (and the associated xpoints)."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "freeSolutions",
   "c": "MMG2D_Free_solutions",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Free the solution."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "setCommonFunc",
   "c": "MMG2D_Set_commonFunc",
   "ret": "void",
   "args": [],
   "doc": "Set common function pointers between mmgs and mmg2d to the matching mmg2d functions."
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "scaleMesh",
   "c": "MMG2D_scaleMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "ls",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Normalize the mesh and size information. This function scales the mesh and the size information between 0 and 1. Compute a default value for the hmin/hmax parameters if needed.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "initFileNames",
   "c": "MMGS_Init_fileNames",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Initialize file names to their default values."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "initParameters",
   "c": "MMGS_Init_parameters",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Initialize the input parameters. Initialization of the input parameters (stored in the Info structure)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setInputMeshName",
   "c": "MMGS_Set_inputMeshName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "meshin",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the input mesh."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setOutputMeshName",
   "c": "MMGS_Set_outputMeshName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "meshout",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the output mesh file."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setInputSolName",
   "c": "MMGS_Set_inputSolName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "solin",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the input solution file."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setOutputSolName",
   "c": "MMGS_Set_outputSolName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "solout",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the output solution file."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setInputParamName",
   "c": "MMGS_Set_inputParamName",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "fparamin",
     "kind": "istring"
    }
   ],
   "doc": "Set the name of the input parameter file."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setSolSize",
   "c": "MMGS_Set_solSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "typEntity",
     "kind": "iint"
    },
    {
     "name": "np",
     "kind": "iint"
    },
    {
     "name": "typSol",
     "kind": "iint"
    }
   ],
   "doc": "Initialize an array of solution fields: set dimension, types and number of fields. To use to initialize an array of solution fields (not used by Mmg itself)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setSolsAtVerticesSize",
   "c": "MMGS_Set_solsAtVerticesSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "nsols",
     "kind": "iint"
    },
    {
     "name": "nentities",
     "kind": "iint"
    },
    {
     "name": "typSol",
     "kind": "iarrayint",
     "nullable": false
    }
   ],
   "doc": "Initialize an array of solution fields defined at vertices: set dimension, types and number of fields. To use to initialize an array of solution fields (not used by Mmg itself)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setMeshSize",
   "c": "MMGS_Set_meshSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "np",
     "kind": "iint"
    },
    {
     "name": "nt",
     "kind": "iint"
    },
    {
     "name": "na",
     "kind": "iint"
    }
   ],
   "doc": "Set the number of vertices, triangles and edges of the mesh and allocate the associated tables. If called again, this function resets the whole mesh to reallocate it at the new size"
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setVertex",
   "c": "MMGS_Set_vertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "kind": "idouble"
    },
    {
     "name": "c1",
     "kind": "idouble"
    },
    {
     "name": "c2",
     "kind": "idouble"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the coordinates of a single vertex. Set vertex coordinates \\a c0, \\a c1,\\a c2 and reference \\a ref at position \\a pos in the mesh structure (\\a pos from 1 to the number of vertices included)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setVertices",
   "c": "MMGS_Set_vertices",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "vertices",
     "kind": "iarraydouble",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the coordinates and references of all vertices in a mesh"
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setTriangle",
   "c": "MMGS_Set_triangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "v2",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the coordinates and reference of a single triangle. This function sets a triangle with vertices \\a v0, \\a v1, \\a v2 and reference \\a ref at position \\a pos in the mesh structure (\\a pos from 1 to the number of triangles included)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setTriangles",
   "c": "MMGS_Set_triangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "tria",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all triangles in the mesh."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setEdge",
   "c": "MMGS_Set_edge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "kind": "iint"
    },
    {
     "name": "v1",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set the vertices and reference of one edge in the mesh. Assigns vertices \\a v0, \\a v1 and reference \\a ref to the edge at position \\a pos in the mesh structure (\\a pos from 1 to the number of edges included)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setCorner",
   "c": "MMGS_Set_corner",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"corner\" attribute to a vertex. This function sets the corner attribute at vertex \\a pos (\\a pos from 1 to the number of vertices included)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "unsetCorner",
   "c": "MMGS_Unset_corner",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"corner\" attribute from a vertex. This function removes the corner attribute from vertex \\a pos (from 1 to the number of vertices included)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setRequiredVertex",
   "c": "MMGS_Set_requiredVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to a vertex. This function sets the required attribute at vertex \\a k. Vertices with this attribute will not be modified by the remesher."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "unsetRequiredVertex",
   "c": "MMGS_Unset_requiredVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from a vertex. This function removes the required attribute from vertex \\a k."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setRequiredTriangle",
   "c": "MMGS_Set_requiredTriangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to a triangle. This function sets the required attribute at triangle \\a k."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "unsetRequiredTriangle",
   "c": "MMGS_Unset_requiredTriangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from a vertex. This function removes the required attribute from triangle \\a k."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setRidge",
   "c": "MMGS_Set_ridge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"ridge\" attribute to an edge. This function gives the ridge attribute to edge \\a k. This influences how this edge is treated by the remesher."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "unsetRidge",
   "c": "MMGS_Unset_ridge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"ridge\" attribute from an edge. This function removes the ridge attribute from edge \\a k."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setRequiredEdge",
   "c": "MMGS_Set_requiredEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Assign the \"required\" attribute to an edge. This function makes edge \\a k a required edge. Required edges will not be modified by the remesher."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "unsetRequiredEdge",
   "c": "MMGS_Unset_requiredEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    }
   ],
   "doc": "Remove the \"required\" attribute from an edge. This function removes the \"required\" attribute from edge \\a k."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setEdges",
   "c": "MMGS_Set_edges",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "edges",
     "kind": "iarrayint",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "iarrayint",
     "nullable": true
    }
   ],
   "doc": "Set the vertices and references of all edges in a mesh."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getEdges",
   "c": "MMGS_Get_edges",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "edges",
     "kind": "oarrayint",
     "output": true,
     "per": 2,
     "countParam": "na",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "na",
     "nullable": true
    },
    {
     "name": "areRidges",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "na",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "na",
     "nullable": true
    }
   ],
   "doc": "Get vertices, references and attributes of all edges in the mesh.",
   "counts": [
    "na"
   ]
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setNormalAtVertex",
   "c": "MMGS_Set_normalAtVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    },
    {
     "name": "n0",
     "kind": "idouble"
    },
    {
     "name": "n1",
     "kind": "idouble"
    },
    {
     "name": "n2",
     "kind": "idouble"
    }
   ],
   "doc": "Set the normal orientation at a single vertex. Set normal (n0,n1,n2) at vertex \\a k."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setScalarSol",
   "c": "MMGS_Set_scalarSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "kind": "idouble"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Get the quality measure of a triangle. / double MMGS_Get_triangleQuality(MMG5_pMesh mesh, MMG5_pSol met, MMG5_int k); /** Set a single element of a scalar solution structure. This function sets the scalar value \\a s at position \\a pos in the solution structure (\\a pos from 1 to the number of vertices included)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setScalarSols",
   "c": "MMGS_Set_scalarSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set the values of all elements of a scalar solution structure."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setVectorSol",
   "c": "MMGS_Set_vectorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "vx",
     "kind": "idouble"
    },
    {
     "name": "vy",
     "kind": "idouble"
    },
    {
     "name": "vz",
     "kind": "idouble"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single element of a vector solution structure. This function sets the vectorial value \\f$(v_x,v_y,v_z)\\f$ at position \\a pos in the solution structure (\\a pos from 1 to the number of vertices included)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setVectorSols",
   "c": "MMGS_Set_vectorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all elements of a vector solution structure. This function sets a vector-valued solution at each element of solution structure."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setTensorSol",
   "c": "MMGS_Set_tensorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "m11",
     "kind": "idouble"
    },
    {
     "name": "m12",
     "kind": "idouble"
    },
    {
     "name": "m13",
     "kind": "idouble"
    },
    {
     "name": "m22",
     "kind": "idouble"
    },
    {
     "name": "m23",
     "kind": "idouble"
    },
    {
     "name": "m33",
     "kind": "idouble"
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single element of a tensor solution structure. This function sets a tensor value at position \\a pos in solution structure (\\a pos from 1 to the number of vertices included)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setTensorSols",
   "c": "MMGS_Set_tensorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all elements of a tensor solution structure."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setIthSolInSolsAtVertices",
   "c": "MMGS_Set_ithSol_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "iarraydouble",
     "nullable": false
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Set a single element of one out of multiple solution fields that are defined on vertices. Set values of the solution at field \\a i of the solution array and at position \\pos (\\a pos from 1 to the number of vertices included and \\a i from 1 to the number of solutions). The type of solution is determined from \\a sol."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setIthSolsInSolsAtVertices",
   "c": "MMGS_Set_ithSols_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "iarraydouble",
     "nullable": false
    }
   ],
   "doc": "Set all elements of one out of multiple solution fields that are defined on vertices. Set values of the solution at field \\a i of the solution array (\\a i from 1 to the number of solutions). The type of solution is determined from \\a sol."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "chkMeshData",
   "c": "MMGS_Chk_meshData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Check if the numbers of given entities match with mesh and solution size and check mesh data. This function checks if the numbers of given entities match with the mesh and solution sizes and checks the mesh data. Use of this function is not mandatory."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setIparameter",
   "c": "MMGS_Set_iparameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "iparam",
     "kind": "iint"
    },
    {
     "name": "val",
     "kind": "iint"
    }
   ],
   "doc": "functions to set parameters */ /** set an integer parameter of the remesher This function sets integer parameter \\a iparam to value \\a val."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setDparameter",
   "c": "MMGS_Set_dparameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "dparam",
     "kind": "iint"
    },
    {
     "name": "val",
     "kind": "idouble"
    }
   ],
   "doc": "set a real-valued parameter of the remesher This function sets the double parameter \\a dparam to value \\a val."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setLocalParameter",
   "c": "MMGS_Set_localParameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "typ",
     "kind": "iint"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "hmin",
     "kind": "idouble"
    },
    {
     "name": "hmax",
     "kind": "idouble"
    },
    {
     "name": "hausd",
     "kind": "idouble"
    }
   ],
   "doc": "set a local parameter Set local parameters: set the hausdorff distance at \\a hausd, the minmal edge length at \\a hmin and the maximal edge length at \\a hmax for all elements of type \\a typ and reference \\a ref."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setMultiMat",
   "c": "MMGS_Set_multiMat",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "ref",
     "kind": "iint"
    },
    {
     "name": "split",
     "kind": "iint"
    },
    {
     "name": "rmin",
     "kind": "iint"
    },
    {
     "name": "rplus",
     "kind": "iint"
    }
   ],
   "doc": "Set the reference mapping for the elements of reference \\a ref in level-set discretization mode. With this function you can determine which references will be given to the triangles on both sides of the level set, after discretization. Negative and positive here refer to areas where the function is smaller or larger, respectively, than the isovalue of the level set."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setLsBaseReference",
   "c": "MMGS_Set_lsBaseReference",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "br",
     "kind": "iint"
    }
   ],
   "doc": "Set a new level-set base reference. Set a new level-set base reference of ref \\a br in level-set discretization mode. Base references are boundary conditions to which an implicit domain can be attached. All implicit volumes that are not attached to listed base references are deleted as spurious volumes by the \\a rmc option."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getMeshSize",
   "c": "MMGS_Get_meshSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "np",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "nt",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "na",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "recover data */ /** Get the number of vertices, triangles, and edges of the mesh."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getSolSize",
   "c": "MMGS_Get_solSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "typEntity",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "np",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "typSol",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the number of elements, dimension, and type of a solution."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getSolsAtVerticesSize",
   "c": "MMGS_Get_solsAtVerticesSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "nsols",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "nentities",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "typSol",
     "kind": "oarrayint",
     "output": true,
     "count": 100,
     "nullable": false
    }
   ],
   "doc": "Get the number of elements, type, and dimensions of several solutions defined on vertices."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getVertex",
   "c": "MMGS_Get_vertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c1",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c2",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isCorner",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the coordinates \\a c0, \\a c1,\\a c2 and reference \\a ref of the next vertex of \\a mesh. This function retrieves the coordinates \\a c0, \\a c1,\\a c2, reference \\a ref, and attributes of the next vertex of a mesh. It is meant to be used in a loop over all vertices. When this function has been called as many times as there are vertices, the internal loop counter will be reset. To obtain data for a specific vertex, the \\ref MMGS_GetByIdx_vertex function can be used instead."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getByIdxVertex",
   "c": "MMGS_GetByIdx_vertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "c0",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c1",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "c2",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isCorner",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "idx",
     "kind": "iint"
    }
   ],
   "doc": "Get the coordinates and reference of a specific vertex in the mesh. This function retrieves the coordinates \\a c0, \\a c1, \\a c2 and reference \\a ref of vertex \\a idx of mesh, as well as its \"corner\" and \"required\" attributes."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getVertices",
   "c": "MMGS_Get_vertices",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "vertices",
     "kind": "oarraydouble",
     "output": true,
     "per": 3,
     "countParam": "np",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": true
    },
    {
     "name": "areCorners",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": true
    }
   ],
   "doc": "Get the coordinates, references and attributes of all vertices in the mesh.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getTriangle",
   "c": "MMGS_Get_triangle",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "v0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "v2",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices, reference, and required attribute of the next triangle in the mesh. This function retrieves the vertices \\a v0, \\a v1, \\a v2, reference \\a ref, and required attribute \\a isRequired of the next triangle of \\a mesh. It is meant to be called in a loop over all triangles. When it has been called as many times as there are triangles, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getTriangles",
   "c": "MMGS_Get_triangles",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "tria",
     "kind": "oarrayint",
     "output": true,
     "per": 3,
     "countParam": "nt",
     "nullable": false
    },
    {
     "name": "refs",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nt",
     "nullable": true
    },
    {
     "name": "areRequired",
     "kind": "oarrayint",
     "output": true,
     "per": 1,
     "countParam": "nt",
     "nullable": true
    }
   ],
   "doc": "Get the vertices, references, and required attributes of all triangles in the mesh.",
   "counts": [
    "nt"
   ]
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getEdge",
   "c": "MMGS_Get_edge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "e0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "e1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRidge",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "isRequired",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the vertices, reference, and attributes of the next edge in the mesh. This function retrieves the extremities \\a e0, \\a e1, reference \\a ref, and attributes of the next edge of \\a mesh. It is meant to be called in a loop over all edges. When it has been called as many times as there are edges in the mesh, the internal edge counter will be reset."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getNormalAtVertex",
   "c": "MMGS_Get_normalAtVertex",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "k",
     "kind": "iint"
    },
    {
     "name": "n0",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "n1",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "n2",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the normal orientation at an edge. This function retrieves the normal (n0,n1,n2) at vertex \\a k."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getScalarSol",
   "c": "MMGS_Get_scalarSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the next element of a scalar solution structure. This function retrieves the next element \\a s of the solution field \\a met. It is meant to be called in a loop over all elements. When it has been called as many times as there are elements in the solution, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getScalarSols",
   "c": "MMGS_Get_scalarSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "s",
     "kind": "oarraydouble",
     "output": true,
     "per": 1,
     "countParam": "np",
     "nullable": false
    }
   ],
   "doc": "Get all elements of a scalar solution structure.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getVectorSol",
   "c": "MMGS_Get_vectorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "vx",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "vy",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "vz",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the next element of a vector solution structure. This function retrieves the next vector-valued element \\f$(v_x,v_y,vz)\\f$ of a solution field. It is meant to be called in a loop over all elements. When it has been called as many times as there are elements in the solution, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getVectorSols",
   "c": "MMGS_Get_vectorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "oarraydouble",
     "output": true,
     "per": 3,
     "countParam": "np",
     "nullable": false
    }
   ],
   "doc": "Get all elements of a vector solution structure. This function retrieves all elements of a vector-valued solution field.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getTensorSol",
   "c": "MMGS_Get_tensorSol",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "m11",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m12",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m13",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m22",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m23",
     "output": true,
     "kind": "odouble"
    },
    {
     "name": "m33",
     "output": true,
     "kind": "odouble"
    }
   ],
   "doc": "Get the next element of a tensor solution structure. This function retrieves the next element \\f$(m_{11},m_{12},m_{13},m_{22},m_{23},m_{33})\\f$ of a tensor-valued solution field. It is meant to be called in a loop over all vertices. When it has been called as many times as there are elements in the solution, the internal loop counter will be reset."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getTensorSols",
   "c": "MMGS_Get_tensorSols",
   "ret": "status",
   "args": [
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sols",
     "kind": "oarraydouble",
     "output": true,
     "per": 6,
     "countParam": "np",
     "nullable": false
    }
   ],
   "doc": "Get all elements of a tensor solution field.",
   "counts": [
    "np"
   ]
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getIthSolInSolsAtVertices",
   "c": "MMGS_Get_ithSol_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "oarraydouble",
     "output": true,
     "per": 1,
     "countParam": "n",
     "nullable": false
    },
    {
     "name": "pos",
     "kind": "iint"
    }
   ],
   "doc": "Get one out of several solutions at a specific vertex. This function retreives the value of field \\a i of the solution array at vertex \\a pos. (\\a pos from 1 to the number of vertices included and \\a i from 1 to the number of solutions). It works for any type of solution; the types are inferred from \\a sol.",
   "counts": [
    "n"
   ]
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getIthSolsInSolsAtVertices",
   "c": "MMGS_Get_ithSols_inSolsAtVertices",
   "ret": "status",
   "args": [
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "i",
     "kind": "iint"
    },
    {
     "name": "s",
     "kind": "oarraydouble",
     "output": true,
     "per": 1,
     "countParam": "n",
     "nullable": false
    }
   ],
   "doc": "Get one out of several solutions at all vertices in the mesh. This function retrieves the values of field \\a i of the solution array \\a sol (\\a i from 1 to \\a the number of solutions). It works for any type of solution; the type is inferred from \\a sol.",
   "counts": [
    "n"
   ]
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getIparameter",
   "c": "MMGS_Get_iparameter",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "iparam",
     "kind": "iint"
    }
   ],
   "doc": "Get the value of an integer parameter of the remesher. This function retrieves the value of integer parameter \\a iparam (see \\ref MMGS_Param for a list of parameters). It returns the value of the parameter, or zero if the value of \\a iparam is not recognized."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadMesh",
   "c": "MMGS_loadMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh (in .mesh/.mesb format) from file. This function reads .mesh (ASCII) and .meshb (binary) files. If the name contains \".mesh\" the file will be read as an ASCII file and if the name contains .meshb it be read as a binary file. If the file contains neither of these strings the function will first try to open \"[filename].meshb\" and if this fails it will try \"[filename].mesh\"."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadVtpMesh",
   "c": "MMGS_loadVtpMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and optionally a solution in VTP (VTK) format from file. This function reads a mesh and optionally one data field in VTK vtp file format (.vtp extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadVtpMeshAndAllData",
   "c": "MMGS_loadVtpMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and multiple solutions in VTP (VTK) format from file. Read a mesh and multiple data fields in VTK vtp file format (.vtp extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadVtuMesh",
   "c": "MMGS_loadVtuMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly data in VTU (VTK) format from file. Read a mesh and optionally one data field in VTK vtu file format (.vtu extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadVtuMeshAndAllData",
   "c": "MMGS_loadVtuMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and multiple solutions in VTU (VTK) format from file. Read a mesh and multiple data field in VTK vtu file format (.vtu extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadVtkMesh",
   "c": "MMGS_loadVtkMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly data in VTK format from file. Read a mesh and optionally one data field in VTK vtk file format (.vtk extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadVtkMeshAndAllData",
   "c": "MMGS_loadVtkMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and multiple solutions in VTK format from file. Read a mesh and multiple data field in VTK vtk file format (.vtk extension). We read only low-order vertices, edges, triangles and quadrangles."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadMshMesh",
   "c": "MMGS_loadMshMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and possibly a solution in .msh format from file. Read a mesh and optionally one data field in MSH file format (.msh extension). We read only low-order vertices, edges, triangles, quadrangles, tetrahedra and prisms."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadMshMeshAndAllData",
   "c": "MMGS_loadMshMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and all data from a file in MSH format. Read a mesh and multiple data in MSH file format (.msh extension). We read only low-order vertices, edges, triangles, quadrangles, tetrahedra and prisms."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadGenericMesh",
   "c": "MMGS_loadGenericMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a mesh and all data from a file. The format will be guessed from the filename extension."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveMesh",
   "c": "MMGS_saveMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh in .mesh or .meshb format. This function saves a mesh in .mesh or .meshb format (depending on the filename extension)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveMshMesh",
   "c": "MMGS_saveMshMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Write mesh and optionally one data field in MSH file format (.msh extension). The file is saved in ASCII format for .msh extension, an in binary format for a .mshb extension."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveMshMeshAndAllData",
   "c": "MMGS_saveMshMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and multiple data fields in MSH format, ascii or binary depending on the filename extension. This function saves a mesh and multiple data fields (that are considered as solutions and not metrics, thus, we do nothing over the ridge vertices) in MSH file format (.msh extension). The file is saved in ASCII format for .msh extension and in binary format for a .mshb extension."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveVtkMesh",
   "c": "MMGS_saveVtkMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Write mesh and optionally one data field in Vtk file format (.vtk extension)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveVtkMeshAndAllData",
   "c": "MMGS_saveVtkMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and multiple data fields in VTK format. This function writes a mesh and a list of data fields in Vtk file format (.vtk extension)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveVtuMesh",
   "c": "MMGS_saveVtuMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Write mesh and optionally one data field vtu Vtk file format (.vtu extension)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveVtuMeshAndAllData",
   "c": "MMGS_saveVtuMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Write a mesh and multiple data fields in vtu Vtk file format (.vtu extension)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveVtpMesh",
   "c": "MMGS_saveVtpMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and optionally one data field in VTP format. This function writes a mesh and optionally one data in polydata Vtk file format (.vtp extension)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveVtpMeshAndAllData",
   "c": "MMGS_saveVtpMesh_and_allData",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save a mesh and multiple data fields in VTP format. This function writes a mesh and multiple data fields in polydata Vtk file format (.vtp extension)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveGenericMesh",
   "c": "MMGS_saveGenericMesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save mesh data in a file whose format depends on the filename extension."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadSol",
   "c": "MMGS_loadSol",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load a metric field (or other solution) in medit's .sol format. Load metric field. The solution file (in medit file format) must contain only 1 solution: the metric."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "loadAllSols",
   "c": "MMGS_loadAllSols",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Load one or more solutions in a solution file in medit file format."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveSol",
   "c": "MMGS_saveSol",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Write an isotropic or anisotropic metric in medit file format."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "saveAllSols",
   "c": "MMGS_saveAllSols",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    },
    {
     "name": "filename",
     "kind": "istring"
    }
   ],
   "doc": "Save one or more solutions in a solution file in medit file format."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "freeAllSols",
   "c": "MMGS_Free_allSols",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handleref"
    }
   ],
   "doc": "Deallocate an array of solution fields"
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "mmgslib",
   "c": "MMGS_mmgslib",
   "ret": "libcode",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Main \"program\" for mesh adaptation. Main program for the library."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "mmgsls",
   "c": "MMGS_mmgsls",
   "ret": "libcode",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Main \"program\" for level-set discretization. Main program for level set discretization library. If a metric \\a met is provided, use it to adapt the mesh."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setfunc",
   "c": "MMGS_setfunc",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "To associate function pointers without calling MMGS_mmgslib */ /** Set function pointers for caltet, lenedg, defsiz and gradsiz."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getNumberOfNonBdyEdges",
   "c": "MMGS_Get_numberOfNonBdyEdges",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "nb_edges",
     "output": true,
     "kind": "oint"
    }
   ],
   "doc": "Get the number of non-boundary edges. Get the number of non-boundary edges (for DG methods for example). An edge is boundary if it is located at the interface of 2 domains with different references, if it belongs to one triangle only or if it is a singular edge (ridge or required). Append these edges to the list of edges."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getNonBdyEdge",
   "c": "MMGS_Get_nonBdyEdge",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "e0",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "e1",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "ref",
     "output": true,
     "kind": "oint"
    },
    {
     "name": "idx",
     "kind": "iint"
    }
   ],
   "doc": "Get vertices and reference of a non-boundary edge. This function returns the vertices \\a e0, \\a e1 and reference \\a ref of the non boundary edge \\a idx. An edge is boundary if it is located at the interface of 2 domains with different references, if it belongs to one triangle only or if it is a singular edge (ridge or required)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setConstantSize",
   "c": "MMGS_Set_constantSize",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Compute an isotropic size map according to the mean of the length of the edges passing through a vertex. / LIBMMGS_EXPORT extern int (*MMGS_doSol)(MMG5_pMesh mesh,MMG5_pSol met); /** Compute a constant size map. This function computes a constant size map according to mesh->info.hsiz, mesh->info.hmin and mesh->info.hmax. It updates these 3 values if they are not compatible."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "usage",
   "c": "MMGS_usage",
   "ret": "status",
   "args": [
    {
     "name": "prog",
     "kind": "istring"
    }
   ],
   "doc": "Print help for mmgs options."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "parsar",
   "c": "MMGS_parsar",
   "ret": "status",
   "args": [
    {
     "name": "argc",
     "kind": "iint"
    },
    {
     "name": "argv",
     "kind": null
    },
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "met",
     "handleType": "sol",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Store command line arguments.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "defaultValues",
   "c": "MMGS_defaultValues",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Print the default parameter values."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "stockOptions",
   "c": "MMGS_stockOptions",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "info",
     "kind": null
    }
   ],
   "doc": "Store the info structure in the mesh structure.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "destockOptions",
   "c": "MMGS_destockOptions",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "info",
     "kind": null
    }
   ],
   "doc": "Recover the info structure stored in the mesh structure.",
   "unsupported": true,
   "reason": "explicitly unsupported (struct ptr / CLI-only)"
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getAdjaTri",
   "c": "MMGS_Get_adjaTri",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "kel",
     "kind": "iint"
    },
    {
     "name": "listri",
     "count": 3,
     "output": true,
     "kind": "oarrayint"
    }
   ],
   "doc": "Return adjacent triangles of a triangle. Find the indices of the 3 adjacent elements of triangle \\a kel. \\f$v_i = 0\\f$ if the \\f$i^{th}\\f$ face has no adjacent element (so we are on a boundary face)."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "getAdjaVerticesFast",
   "c": "MMGS_Get_adjaVerticesFast",
   "ret": "int",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "ip",
     "kind": "iint"
    },
    {
     "name": "start",
     "kind": "iint"
    },
    {
     "name": "lispoi",
     "count": 1024,
     "output": true,
     "kind": "oarrayint"
    }
   ],
   "doc": "Find adjacent vertices of a triangle. Find the indices of the adjacent vertices of the vertex \\a ip of the triangle \\a start."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "computeEigenv",
   "c": "MMGS_Compute_eigenv",
   "ret": "int",
   "args": [
    {
     "name": "m",
     "kind": "iarraydouble",
     "nullable": false,
     "count": 6
    },
    {
     "name": "lambda",
     "kind": "oarraydouble",
     "output": true,
     "count": 3,
     "nullable": false
    },
    {
     "name": "vp",
     "kind": "oarraydouble",
     "output": true,
     "count": 9,
     "nullable": false
    }
   ],
   "doc": "Compute the real eigenvalues and eigenvectors of a symmetric matrix Compute the real eigenvalues and eigenvectors of a symmetric matrix m whose upper part is provided (m11, m12, m13, m22, m23, m33 in this order). lambda[0] is the eigenvalue associated to the eigenvector ( v[0][0], v[0,1], v[0,2] ) in C and to the eigenvector v(1,:) in fortran lambda[1] is the eigenvalue associated to the eigenvector ( v[1][0], v[1,1], v[1,2] ) in C and to the eigenvector v(2,:) in fortran lambda[2] is the eigenvalue associated to the eigenvector ( v[2][0], v[2,1], v[2,2] ) in C and to the eigenvector v(3,:) in fortran"
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "freeSolutions",
   "c": "MMGS_Free_solutions",
   "ret": "void",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    },
    {
     "name": "sol",
     "handleType": "sol",
     "kind": "handle"
    }
   ],
   "doc": "Free a solution."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "cleanIsoSurf",
   "c": "MMGS_Clean_isoSurf",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "handleType": "mesh",
     "kind": "handle"
    }
   ],
   "doc": "Clean data (triangles and edges) linked to isosurface."
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "setCommonFunc",
   "c": "MMGS_Set_commonFunc",
   "ret": "void",
   "args": [],
   "doc": "Set common function pointers between mmgs and mmg3d to the matching mmgs functions."
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "initMesh",
   "c": "mmgjs_MMG3D_Init_mesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    },
    {
     "name": "disp",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Allocate and initialize the mesh and solution structures (fixed-arity shim over the variadic MMG3D_Init_mesh).",
   "shim": true
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "freeAll",
   "c": "mmgjs_MMG3D_Free_all",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    },
    {
     "name": "disp",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Free all allocated structures (fixed-arity shim over the variadic MMG3D_Free_all).",
   "shim": true
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "freeStructures",
   "c": "mmgjs_MMG3D_Free_structures",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    },
    {
     "name": "disp",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Free mesh/sol arrays but keep the structures (shim over MMG3D_Free_structures).",
   "shim": true
  },
  {
   "path": [
    "mmg3d"
   ],
   "js": "freeNames",
   "c": "mmgjs_MMG3D_Free_names",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    },
    {
     "name": "disp",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Free file-name strings (shim over MMG3D_Free_names).",
   "shim": true
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "initMesh",
   "c": "mmgjs_MMG2D_Init_mesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    },
    {
     "name": "disp",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Allocate and initialize the mesh and solution structures (fixed-arity shim over the variadic MMG2D_Init_mesh).",
   "shim": true
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "freeAll",
   "c": "mmgjs_MMG2D_Free_all",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    },
    {
     "name": "disp",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Free all allocated structures (fixed-arity shim over the variadic MMG2D_Free_all).",
   "shim": true
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "freeStructures",
   "c": "mmgjs_MMG2D_Free_structures",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    },
    {
     "name": "disp",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Free mesh/sol arrays but keep the structures (shim over MMG2D_Free_structures).",
   "shim": true
  },
  {
   "path": [
    "mmg2d"
   ],
   "js": "freeNames",
   "c": "mmgjs_MMG2D_Free_names",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    },
    {
     "name": "disp",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Free file-name strings (shim over MMG2D_Free_names).",
   "shim": true
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "initMesh",
   "c": "mmgjs_MMGS_Init_mesh",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Allocate and initialize the mesh and solution structures (fixed-arity shim over the variadic MMGS_Init_mesh).",
   "shim": true
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "freeAll",
   "c": "mmgjs_MMGS_Free_all",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Free all allocated structures (fixed-arity shim over the variadic MMGS_Free_all).",
   "shim": true
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "freeStructures",
   "c": "mmgjs_MMGS_Free_structures",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Free mesh/sol arrays but keep the structures (shim over MMGS_Free_structures).",
   "shim": true
  },
  {
   "path": [
    "mmgs"
   ],
   "js": "freeNames",
   "c": "mmgjs_MMGS_Free_names",
   "ret": "status",
   "args": [
    {
     "name": "mesh",
     "kind": "handleref",
     "handleType": "mesh"
    },
    {
     "name": "met",
     "kind": "handleref",
     "handleType": "sol"
    },
    {
     "name": "ls",
     "kind": "handleref",
     "handleType": "sol",
     "nullable": true
    }
   ],
   "doc": "Free file-name strings (shim over MMGS_Free_names).",
   "shim": true
  }
 ],
 "constants": {
  "root": {
   "MMG5_SUCCESS": 0,
   "MMG5_LOWFAILURE": 1,
   "MMG5_STRONGFAILURE": 2,
   "MMG5_Notype": 0,
   "MMG5_Scalar": 1,
   "MMG5_Vector": 2,
   "MMG5_Tensor": 3,
   "MMG5_Noentity": 0,
   "MMG5_Vertex": 1,
   "MMG5_Edg": 2,
   "MMG5_Triangle": 3,
   "MMG5_Tetrahedron": 4,
   "MMG5_FMT_MeditASCII": 0,
   "MMG5_FMT_MeditBinary": 1,
   "MMG5_FMT_GmshASCII": 2,
   "MMG5_FMT_GmshBinary": 3,
   "MMG5_FMT_VtkPvtp": 4,
   "MMG5_FMT_VtkPvtu": 5,
   "MMG5_FMT_VtkVtu": 6,
   "MMG5_FMT_VtkVtp": 7,
   "MMG5_FMT_VtkVtk": 8,
   "MMG5_FMT_Tetgen": 9,
   "MMG5_FMT_Unknown": 10
  },
  "mmg3d": {
   "IPARAM_verbose": 0,
   "IPARAM_mem": 1,
   "IPARAM_debug": 2,
   "IPARAM_angle": 3,
   "IPARAM_iso": 4,
   "IPARAM_isosurf": 5,
   "IPARAM_nofem": 6,
   "IPARAM_opnbdy": 7,
   "IPARAM_lag": 8,
   "IPARAM_optim": 9,
   "IPARAM_optimLES": 10,
   "IPARAM_noinsert": 11,
   "IPARAM_noswap": 12,
   "IPARAM_nomove": 13,
   "IPARAM_nosurf": 14,
   "IPARAM_nreg": 15,
   "IPARAM_xreg": 16,
   "IPARAM_numberOfLocalParam": 17,
   "IPARAM_numberOfLSBaseReferences": 18,
   "IPARAM_numberOfMat": 19,
   "IPARAM_numsubdomain": 20,
   "IPARAM_renum": 21,
   "IPARAM_anisosize": 22,
   "IPARAM_octree": 23,
   "IPARAM_nosizreq": 24,
   "IPARAM_isoref": 25,
   "DPARAM_angleDetection": 26,
   "DPARAM_hmin": 27,
   "DPARAM_hmax": 28,
   "DPARAM_hsiz": 29,
   "DPARAM_hausd": 30,
   "DPARAM_hgrad": 31,
   "DPARAM_hgradreq": 32,
   "DPARAM_ls": 33,
   "DPARAM_xreg": 34,
   "DPARAM_rmc": 35,
   "PARAM_size": 36
  },
  "mmg2d": {
   "IPARAM_verbose": 0,
   "IPARAM_mem": 1,
   "IPARAM_debug": 2,
   "IPARAM_angle": 3,
   "IPARAM_iso": 4,
   "IPARAM_isosurf": 5,
   "IPARAM_opnbdy": 6,
   "IPARAM_lag": 7,
   "IPARAM_3dMedit": 8,
   "IPARAM_optim": 9,
   "IPARAM_noinsert": 10,
   "IPARAM_noswap": 11,
   "IPARAM_nomove": 12,
   "IPARAM_nosurf": 13,
   "IPARAM_nreg": 14,
   "IPARAM_xreg": 15,
   "IPARAM_numsubdomain": 16,
   "IPARAM_numberOfLocalParam": 17,
   "IPARAM_numberOfLSBaseReferences": 18,
   "IPARAM_numberOfMat": 19,
   "IPARAM_anisosize": 20,
   "IPARAM_nosizreq": 21,
   "DPARAM_angleDetection": 22,
   "DPARAM_hmin": 23,
   "DPARAM_hmax": 24,
   "DPARAM_hsiz": 25,
   "DPARAM_hausd": 26,
   "DPARAM_hgrad": 27,
   "DPARAM_hgradreq": 28,
   "DPARAM_ls": 29,
   "DPARAM_xreg": 30,
   "DPARAM_rmc": 31,
   "IPARAM_nofem": 32,
   "IPARAM_isoref": 33
  },
  "mmgs": {
   "IPARAM_verbose": 0,
   "IPARAM_mem": 1,
   "IPARAM_debug": 2,
   "IPARAM_angle": 3,
   "IPARAM_iso": 4,
   "IPARAM_isosurf": 5,
   "IPARAM_isoref": 6,
   "IPARAM_keepRef": 7,
   "IPARAM_optim": 8,
   "IPARAM_noinsert": 9,
   "IPARAM_noswap": 10,
   "IPARAM_nomove": 11,
   "IPARAM_nreg": 12,
   "IPARAM_xreg": 13,
   "IPARAM_numberOfLocalParam": 14,
   "IPARAM_numberOfLSBaseReferences": 15,
   "IPARAM_numberOfMat": 16,
   "IPARAM_numsubdomain": 17,
   "IPARAM_renum": 18,
   "IPARAM_anisosize": 19,
   "IPARAM_nosizreq": 20,
   "DPARAM_angleDetection": 21,
   "DPARAM_hmin": 22,
   "DPARAM_hmax": 23,
   "DPARAM_hsiz": 24,
   "DPARAM_hausd": 25,
   "DPARAM_hgrad": 26,
   "DPARAM_hgradreq": 27,
   "DPARAM_ls": 28,
   "DPARAM_xreg": 29,
   "DPARAM_rmc": 30,
   "PARAM_size": 31
  }
 },
 "aliases": {
  "MMG3D_mmg3dlib": "remesh",
  "MMG3D_mmg3dls": "levelset",
  "MMG3D_mmg3dmov": "move",
  "MMG2D_mmg2dlib": "remesh",
  "MMG2D_mmg2dmesh": "generate",
  "MMG2D_mmg2dls": "levelset",
  "MMG2D_mmg2dmov": "move",
  "MMGS_mmgslib": "remesh",
  "MMGS_mmgsls": "levelset"
 }
};
