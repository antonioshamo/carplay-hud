import Foundation
import SceneKit
import AppKit
func loadGLB(_ path:String)throws -> SCNScene {
 let bytes=try Data(contentsOf:URL(fileURLWithPath:path))
 func u32(_ offset:Int)->Int{Int(bytes.withUnsafeBytes{$0.loadUnaligned(fromByteOffset:offset,as:UInt32.self)})}
 guard u32(0)==0x46546c67,u32(4)==2,u32(8)==bytes.count else{throw NSError(domain:"GLB",code:1)}
 let jsonSize=u32(12),j=try JSONSerialization.jsonObject(with:bytes.subdata(in:20..<20+jsonSize)) as! [String:Any]
 let start=20+jsonSize,bin=bytes.subdata(in:start+8..<start+8+u32(start))
 let access=j["accessors"] as! [[String:Any]],views=j["bufferViews"] as! [[String:Any]],meshes=j["meshes"] as! [[String:Any]],nodes=j["nodes"] as! [[String:Any]]
 let textures=j["textures"] as? [[String:Any]] ?? [],images=j["images"] as? [[String:Any]] ?? []
 func image(_ index:Int)->NSImage?{let b=views[images[index]["bufferView"] as! Int],s=b["byteOffset"] as? Int ?? 0;return NSImage(data:bin.subdata(in:s..<s+(b["byteLength"] as! Int)))}
 let materials=(j["materials"] as! [[String:Any]]).map{src -> SCNMaterial in
  let m=SCNMaterial(),p=src["pbrMetallicRoughness"] as? [String:Any] ?? [:],color=p["baseColorFactor"] as? [Double] ?? [1,1,1,1]
  m.name=src["name"] as? String;m.lightingModel = .physicallyBased
  let tint=NSColor(calibratedRed:color[0],green:color[1],blue:color[2],alpha:color[3])
  if let tex=p["baseColorTexture"] as? [String:Any],let idx=tex["index"] as? Int {m.diffuse.contents=image(textures[idx]["source"] as! Int);m.multiply.contents=tint}
  else{m.diffuse.contents=tint}
  m.metalness.contents=p["metallicFactor"] as? Double ?? 1;m.roughness.contents=p["roughnessFactor"] as? Double ?? 1
  if let e=src["emissiveFactor"] as? [Double]{m.emission.contents=NSColor(calibratedRed:e[0],green:e[1],blue:e[2],alpha:1)}
  if let e=src["extensions"] as? [String:Any],let coat=e["KHR_materials_clearcoat"] as? [String:Any]{m.clearCoat.contents=coat["clearcoatFactor"] ?? 0;m.clearCoatRoughness.contents=coat["clearcoatRoughnessFactor"] ?? 0}
  m.isDoubleSided=src["doubleSided"] as? Bool ?? false
  if src["alphaMode"] as? String == "BLEND" {m.transparency=1;m.transparencyMode = .aOne;m.blendMode = .alpha;m.writesToDepthBuffer=false}
  return m
 }
 func source(_ index:Int,_ semantic:SCNGeometrySource.Semantic)->SCNGeometrySource{
  let a=access[index],b=views[a["bufferView"] as! Int],components=a["type"] as! String == "VEC2" ? 2:3
  precondition(a["componentType"] as! Int == 5126)
  return SCNGeometrySource(data:bin,semantic:semantic,vectorCount:a["count"] as! Int,usesFloatComponents:true,componentsPerVector:components,bytesPerComponent:4,dataOffset:(b["byteOffset"] as? Int ?? 0)+(a["byteOffset"] as? Int ?? 0),dataStride:b["byteStride"] as? Int ?? components*4)
 }
 let made=nodes.map{_ in SCNNode()}
 for (i,n) in nodes.enumerated(){let node=made[i];node.name=n["name"] as? String
  if let mat=n["matrix"] as? [Double]{node.simdTransform=simd_float4x4(columns:(SIMD4(Float(mat[0]),Float(mat[1]),Float(mat[2]),Float(mat[3])),SIMD4(Float(mat[4]),Float(mat[5]),Float(mat[6]),Float(mat[7])),SIMD4(Float(mat[8]),Float(mat[9]),Float(mat[10]),Float(mat[11])),SIMD4(Float(mat[12]),Float(mat[13]),Float(mat[14]),Float(mat[15]))))}
  else{if let v=n["translation"] as? [Double]{node.position=SCNVector3(v[0],v[1],v[2])};if let v=n["scale"] as? [Double]{node.scale=SCNVector3(v[0],v[1],v[2])};if let v=n["rotation"] as? [Double]{node.orientation=SCNQuaternion(v[0],v[1],v[2],v[3])}}
  if let mi=n["mesh"] as? Int{for p in meshes[mi]["primitives"] as! [[String:Any]]{
   precondition(p["mode"] as? Int ?? 4 == 4)
   let at=p["attributes"] as! [String:Int];var sources=[source(at["POSITION"]!,.vertex)];if let k=at["NORMAL"]{sources.append(source(k,.normal))};if let k=at["TEXCOORD_0"]{sources.append(source(k,.texcoord))}
   let a=access[p["indices"] as! Int],b=views[a["bufferView"] as! Int],s=(b["byteOffset"] as? Int ?? 0)+(a["byteOffset"] as? Int ?? 0),sz=a["componentType"] as! Int == 5125 ? 4:2,count=a["count"] as! Int
   let e=SCNGeometryElement(data:bin.subdata(in:s..<s+count*sz),primitiveType:.triangles,primitiveCount:count/3,bytesPerIndex:sz),g=SCNGeometry(sources:sources,elements:[e]);g.materials=[materials[p["material"] as! Int]];let child=SCNNode(geometry:g);if !g.materials[0].writesToDepthBuffer { child.renderingOrder=100 };node.addChildNode(child)
  }}
  for child in n["children"] as? [Int] ?? []{node.addChildNode(made[child])}
 }
 let scene=SCNScene(),scenes=j["scenes"] as! [[String:Any]]
 for i in scenes[j["scene"] as? Int ?? 0]["nodes"] as! [Int]{scene.rootNode.addChildNode(made[i])}
 return scene
}
