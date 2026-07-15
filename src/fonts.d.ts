// ไฟล์ .ttf ถูก import เป็น ArrayBuffer ผ่าน wrangler Data rule
declare module "*.ttf" {
  const data: ArrayBuffer;
  export default data;
}
