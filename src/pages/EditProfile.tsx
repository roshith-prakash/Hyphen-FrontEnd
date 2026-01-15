import { useDBUser } from "@/context/UserContext";
import {
  PrimaryButton,
  ErrorStatement,
  Input,
  SecondaryButton,
} from "@/components";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { IoCloudUploadOutline } from "react-icons/io5";
import { axiosInstance } from "@/utils/axios";
import toast from "react-hot-toast";
import { type ContextValue, useDarkMode } from "@/context/DarkModeContext";
import { useNavigate } from "react-router-dom";

import Cropper from "react-easy-crop";
import getCroppedImg from "../utils/cropImage"; // (You'll add this util below)
import Modal from "@/components/reuseit/Modal"; // optional: modal component for cropping
import { compressImage } from "@/utils/compressImage";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

const EditProfile = () => {
  const { isDarkMode } = useDarkMode() as ContextValue;
  // Db user object
  const { dbUser, fetchUser } = useDBUser();
  // Ref for file input
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Name of the user to be stored in DB
  const [name, setName] = useState("");
  // Profile image of user
  const [image, setImage] = useState();
  // To disable button
  const [disabled, setDisabled] = useState(false);
  // Error
  const [error, setError] = useState({
    name: 0,
  });
  const navigate = useNavigate();

  // Image Crop States
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Scroll to the top of page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Set window title.
  useEffect(() => {
    document.title = `Edit Profile | Quizzer AI`;
  }, []);

  // To set default values.
  useEffect(() => {
    if (dbUser) {
      setName(dbUser?.name);
      setImage(dbUser?.photoURL);
    }
  }, [dbUser]);

  // Set the received image in the state.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setShowCropper(true);

    // Clear input
    // @ts-expect-error null
    if (fileRef?.current) fileRef.current.value = null;
  };

  // Submit the data to the server to edit the user object.
  const handleSubmit = async () => {
    // Reset Errors
    setError({
      name: 0,
    });

    // Validate Data entered by user
    if (name == null || name == undefined || name.length <= 0) {
      setError((prev) => ({ ...prev, name: 1 }));
      return;
    } else if (name.length > 30) {
      setError((prev) => ({ ...prev, name: 2 }));
      return;
    }

    // Disable Button
    setDisabled(true);

    // Create formdata instance
    const formData = new FormData();

    // If image is added - add a file
    if (image && typeof image != "string") {
      const compressedFile = await compressImage(image);
      formData.append("file", compressedFile);
    }

    // Add details in the user object
    const obj = {
      name: name,
      image: typeof image == "string" ? image : null,
    };

    // Append the updated user object in formdata
    formData.append("updatedUser", JSON.stringify(obj));
    formData.append("userId", dbUser?.id);

    // Update user in DB
    axiosInstance
      .post("/user/update-user", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(() => {
        setDisabled(false);
        fetchUser();
        navigate("/profile");
        toast.success("Profile Updated!", { position: "bottom-right" });
      })
      .catch(() => {
        // Display error
        toast.error("Something went wrong!", { position: "bottom-right" });
        // Enable button
        setDisabled(false);
      });
  };

  const handlePasswordReset = async () => {
    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, dbUser?.email); // Replace with your Firebase auth instance & user’s email
      toast("Password reset email sent!");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!");
      // Maybe show error message too
    }
  };

  return (
    <>
      {showCropper && selectedFile && (
        <Modal
          className="px-0 py-0 pb-5"
          isOpen={showCropper}
          onClose={() => setShowCropper(false)}
        >
          <div className="relative w-full h-[400px] bg-black">
            <Cropper
              image={URL.createObjectURL(selectedFile)}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedAreaPixels) => {
                // @ts-expect-error type issue with state
                setCroppedAreaPixels(croppedAreaPixels);
              }}
            />
          </div>
          <div className="flex justify-end px-5 gap-4 mt-4">
            <PrimaryButton
              onClick={async () => {
                const croppedImage = await getCroppedImg(
                  URL.createObjectURL(selectedFile),
                  croppedAreaPixels
                );
                // @ts-expect-error type issue with state
                setImage(croppedImage);
                setShowCropper(false);
              }}
              text="Crop & Use"
            ></PrimaryButton>
            <SecondaryButton
              text="Cancel"
              onClick={() => setShowCropper(false)}
            ></SecondaryButton>
          </div>
        </Modal>
      )}

      <div className="min-h-[70vh] md:min-h-[65vh] lg:min-h-[60vh] bg-bgwhite flex items-center justify-center pt-12 pb-32">
        <div className="bg-white dark:bg-secondarydarkbg dark:border-white/10 dark:border-2 w-full dark:bg-darkgrey dark:text-darkmodetext border-1 max-w-[95%] md:max-w-3xl md:mt-5 lg:mt-5 p-5 md:px-20 shadow-xl rounded-xl pb-10">
          {/* Title */}
          <h1 className="text-ink dark:text-darkmodetext pt-5 font-bold text-2xl text-center">
            Edit your Account!
          </h1>

          {/* Image Upload */}
          <div className="mt-10 flex flex-col items-center gap-y-5">
            {/* Input to accept image */}
            <input
              className="hidden"
              type="file"
              ref={fileRef}
              accept="image/png, image/jpg, image/jpeg"
              onChange={handleFileChange}
            />
            {/* Display user image or default account image */}
            <div className="flex justify-center">
              {image ? (
                <img
                  src={
                    typeof image == "string"
                      ? image
                      : URL.createObjectURL(image)
                  }
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <img
                  src={
                    isDarkMode
                      ? "https://res.cloudinary.com/do8rpl9l4/image/upload/v1740987081/accountcircle_axsjlm.png"
                      : "https://res.cloudinary.com/do8rpl9l4/image/upload/v1736740649/account_glotqh.png"
                  }
                  className="h-24 w-24 rounded-full"
                />
              )}
            </div>

            {/* Button to select an image */}
            <button
              onClick={() => {
                if (fileRef?.current) fileRef.current.click();
              }}
              className="cursor-pointer hover:bg-hovercta dark:hover:bg-cta hover:border-hovercta hover:text-white dark:hover:border-cta border-darkbg/25 dark:border-white/25 border-1 flex  gap-x-2 py-2 justify-center items-center px-14 shadow rounded-lg font-medium active:shadow transition-all disabled:text-greyText"
            >
              Upload <IoCloudUploadOutline className="translate-y-0.5" />
            </button>
          </div>

          {/* Name */}
          <div className="mt-14 flex flex-col gap-y-8 ">
            {/* Name Input field */}
            <div className="lg:flex-1 px-2">
              <p className="font-medium">Name</p>
              <Input
                value={name}
                className="focus:border-darkbg dark:focus:border-white transition-all"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  if (
                    e.target.value != null &&
                    e.target.value != undefined &&
                    e.target.value.length > 0 &&
                    e.target.value.length < 30
                  ) {
                    setError((prev) => ({ ...prev, name: 0 }));
                    return;
                  }
                }}
                onBlur={() => {
                  if (name == null || name == undefined || name.length <= 0) {
                    setError((prev) => ({ ...prev, name: 1 }));
                    return;
                  } else if (name.length > 30) {
                    setError((prev) => ({ ...prev, name: 2 }));
                    return;
                  } else {
                    setError((prev) => ({ ...prev, name: 0 }));
                  }
                }}
                placeholder={"Enter your name"}
              />

              <div className="flex w-full justify-between">
                <div>
                  <ErrorStatement
                    isOpen={error.name == 1}
                    text={"Please enter your name."}
                  />

                  <ErrorStatement
                    isOpen={error.name == 2}
                    text={"Name cannot exceed 30 characters."}
                  />
                </div>
                <p
                  className={`text-right mt-0.5 mr-0.5 ${
                    name?.length > 30 && "text-red-500"
                  }`}
                >
                  {name?.length}/30
                </p>
              </div>
            </div>
          </div>

          {/* Password Reset Button */}
          <div className="mt-8 flex justify-center items-center">
            <button
              onClick={handlePasswordReset} // 👉 your handler to send the email
              className="cursor-pointer hover:bg-hovercta dark:hover:bg-cta hover:border-hovercta hover:text-white dark:hover:border-cta border-darkbg/25 dark:border-white/25 border-1 flex gap-x-2 py-2 justify-center items-center px-8 shadow rounded-lg font-medium active:shadow transition-all"
            >
              Send Password Reset Email
            </button>
          </div>

          {/* Submit Button */}
          <div className="mt-10 flex justify-center items-center">
            <PrimaryButton
              onClick={handleSubmit}
              disabled={disabled}
              disabledText={"Please Wait..."}
              text={"Submit"}
              className="w-full max-w-xs"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default EditProfile;
