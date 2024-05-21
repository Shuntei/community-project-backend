import multer from "multer"
import {v4} from "uuid"

const exts = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}

const fileFilter = (req, file, cb)=>{
    cb(null, !!exts[file.mimetype])
}

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        // null is for throwing error or not
        cb(null, "public/img")
    },
    filename: (req, file, cb)=>{
        const f = v4() + exts[file.mimetype];
        cb(null, f)
    }

})
const upload = multer({fileFilter, storage})

export default upload