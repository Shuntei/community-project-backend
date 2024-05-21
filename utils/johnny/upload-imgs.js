import multer from "multer";
import { v4 } from "uuid";

const exts = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const fileFilter = (req, file, callback) => {
  callback(null, !!exts[file.mimetype]);
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    // callback(null, "../ruins-next/components/johnny/upload"); 前端位置
    callback(null, "routes/johnny/upload");
  },
  filename: (req, file, callback) => {
    // const f = v4() + exts[file.mimetype];
    const f = Date.now() + file.originalname;
    // const f = file.originalname;

    callback(null, f);
  },
});

export default multer({ fileFilter, storage });