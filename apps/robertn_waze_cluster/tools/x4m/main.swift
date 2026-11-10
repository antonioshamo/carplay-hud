import Foundation
import SceneKit
import AppKit
import Metal
let input=CommandLine.arguments[1], output=CommandLine.arguments[2]
let scene=try loadGLB(input)
let root=SCNNode();for child in scene.rootNode.childNodes{root.addChildNode(child)}
scene.rootNode.addChildNode(root)
let (lo,hi)=root.boundingBox
print("bounds \(lo) \(hi)")
let center=SCNVector3((lo.x+hi.x)/2,(lo.y+hi.y)/2,(lo.z+hi.z)/2)
root.position=SCNVector3(-center.x,-center.y,-center.z)
let oriented=SCNNode();oriented.eulerAngles.x = 0;oriented.addChildNode(root);scene.rootNode.addChildNode(oriented)
let span=max(hi.x-lo.x,max(hi.y-lo.y,hi.z-lo.z))
let camera=SCNNode();camera.camera=SCNCamera();camera.camera!.usesOrthographicProjection=true;camera.camera!.orthographicScale=Double(span)*0.30;camera.camera!.zNear=0.01;camera.camera!.zFar=Double(span)*20
camera.position=SCNVector3(span*1.5,span*0.65,span*1.5);camera.look(at:SCNVector3Zero,up:SCNVector3(0,1,0),localFront:SCNVector3(0,0,-1))
scene.rootNode.addChildNode(camera)
func light(_ position:SCNVector3,_ intensity:CGFloat,_ color:NSColor){let n=SCNNode();let l=SCNLight();l.type = .omni;l.intensity=intensity;l.color=color;n.light=l;n.position=position;scene.rootNode.addChildNode(n)}
light(SCNVector3(span*2,span*3,span*2),750,.white)
light(SCNVector3(-span*2,span,span),350,NSColor(calibratedRed:0.8,green:0.87,blue:1,alpha:1))
light(SCNVector3(0,span,-span*2),650,.white)
let ambient=SCNNode();ambient.light=SCNLight();ambient.light!.type = .ambient;ambient.light!.intensity=200;ambient.light!.color=NSColor.white;scene.rootNode.addChildNode(ambient)
scene.background.contents=NSColor.clear
let renderer=SCNRenderer(device:MTLCreateSystemDefaultDevice(),options:nil);renderer.scene=scene;renderer.pointOfView=camera

try FileManager.default.createDirectory(atPath:output,withIntermediateDirectories:true)
for i in 0..<96 {
 autoreleasepool {
  let yaw=Double(i)*2*Double.pi/96, radius=Double(span)*2.12
  camera.position=SCNVector3(radius*cos(yaw),Double(span)*0.40,radius*sin(yaw));camera.look(at:SCNVector3Zero,up:SCNVector3(0,1,0),localFront:SCNVector3(0,0,-1))
  let image=renderer.snapshot(atTime:Double(i),with:CGSize(width:900,height:450),antialiasingMode:.multisampling4X)
  let png=NSBitmapImageRep(data:image.tiffRepresentation!)!.representation(using:.png,properties:[:])!
  try! png.write(to:URL(fileURLWithPath:output+String(format:"/%03d.png",i)))
 }
 if i%12==0{print("rendered \(i)/96")}
}
print("complete")
