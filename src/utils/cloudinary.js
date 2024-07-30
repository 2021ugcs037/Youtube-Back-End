import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs' // file system


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        // console.log("rvfehrgfcr")
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // console.log("done with upload")
        // file has been uploaded successfully
        // console.log("file is uploaded on cloudinary ",response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        // local server se file ko hta do qki upload oprn fail hogya
        // console.log(error)
        fs.unlinkSync(localFilePath); 
        return null;
        
    }
}
const deleteOnCloudinary = async (public_id, resource_type="image") => {
    try {
        if (!public_id) return null;

        //delete file from cloudinary
        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: `${resource_type}`
        });
    } catch (error) {
        console.log("delete on cloudinary failed", error);
        return error;
    }
};


export {uploadOnCloudinary,deleteOnCloudinary}