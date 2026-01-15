import { PrimaryButton, SecondaryButton } from "@/components";
import { useDBUser } from "../context/UserContext";
import { BsFillTrash3Fill, BsPen } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { TfiWrite } from "react-icons/tfi";
import { axiosInstance } from "../utils/axios";
import { auth } from "../firebase/firebase";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";
import AlertModal from "@/components/reuseit/AlertModal";

import banner from "@/assets/profileBackground1.png";

const Profile = () => {
  const navigate = useNavigate();
  const { dbUser, setDbUser } = useDBUser();
  const [disabled, setDisabled] = useState(false);
  const [isDeleteProfileModalOpen, setIsDeleteProfileModalOpen] =
    useState(false);

  // Set window title.
  useEffect(() => {
    document.title = `${dbUser?.name} | Quizzer AI`;
  }, [dbUser]);

  // Scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Delete the user
  const deleteUser = () => {
    setDisabled(true);
    const user = auth.currentUser;

    user
      ?.delete()
      ?.then(() => {
        axiosInstance
          .post("/user/delete-user", { userId: dbUser?.id })
          .then(() => {
            toast.success("User Deleted.");
            setDbUser(null);
            setDisabled(false);
            setIsDeleteProfileModalOpen(false);
            navigate("/");
          })
          .catch((err) => {
            setDisabled(false);
            setIsDeleteProfileModalOpen(false);
            console.log(err);
            toast.error("Something went wrong.");
          });
      })
      .catch((error) => {
        setDisabled(false);
        console.log(error);
        setIsDeleteProfileModalOpen(false);
        const errorMessage = error?.message;
        if (String(errorMessage).includes("auth/requires-recent-login")) {
          toast.error("Please login again before deleting your account.");
        } else {
          toast.error("Something went wrong.");
        }
      });
  };

  return (
    <>
      {/* Delete Account Modal */}
      <AlertModal
        isOpen={isDeleteProfileModalOpen}
        className="max-w-xl"
        onClose={() => setIsDeleteProfileModalOpen(false)}
      >
        <div className="flex flex-col gap-y-2">
          {/* Title */}
          <h1 className="dark:text-darkmodetext font-bold text-2xl">
            Are you sure you want to delete your account?
          </h1>

          {/* Subtitle */}
          <h2 className="dark:text-darkmodetext mt-1 text-sm text-darkbg/70">
            This action cannot be reversed. Deleting your account will remove
            all your teams and leagues.
          </h2>

          {/* Buttons */}
          <div className="mt-5 flex gap-x-5 justify-end">
            <PrimaryButton
              className="text-sm bg-red-500 border-red-500 hover:bg-red-600 hover:border-red-600"
              onClick={deleteUser}
              disabled={disabled}
              disabledText="Please Wait..."
              text="Delete"
            />
            <SecondaryButton
              className="text-sm"
              disabled={disabled}
              disabledText="Please Wait..."
              onClick={() => setIsDeleteProfileModalOpen(false)}
              text="Cancel"
            />
          </div>
        </div>
      </AlertModal>

      {/* Main */}
      <div className="lg:min-h-screen bg-bgwhite dark:bg-darkbg dark:text-darkmodetext w-full pb-20">
        {/* Background color div */}
        <div className="bg-secondarydarkbg overflow-hidden dark:bg-darkgrey border-b-4 border-black h-48 dark:border-white/10">
          <img src={banner} className="object-cover" />
        </div>

        {/* Profile Info Div */}
        <div className="bg-white dark:bg-secondarydarkbg dark:border-white/25 shadow-xl -translate-y-14 border-2 min-h-52 pt-20 pb-10 rounded-lg mx-5 md:mx-10 lg:mx-20">
          {/* Floating Image */}
          <div className="absolute w-full -top-18 flex justify-center">
            {dbUser?.photoURL ? (
              <img
                src={dbUser?.photoURL}
                className="bg-white  rounded-full h-36 w-36 border-8 border-white dark:border-secondarydarkbg dark:border-darkgrey pointer-events-none"
              />
            ) : (
              <img
                src={
                  "https://res.cloudinary.com/do8rpl9l4/image/upload/v1740987081/accountcircle_axsjlm.png"
                }
                className="bg-secondarydarkbg rounded-full h-36 w-36 border-8 border-white dark:border-secondarydarkbg dark:border-darkgrey pointer-events-none"
              />
            )}
          </div>

          {/* Edit & delete icon on small screen */}
          <div className="lg:hidden absolute flex gap-x-4 right-6 top-5">
            <BsPen
              className="text-xl hover:text-cta dark:hover:text-darkmodeCTA transition-all cursor-pointer"
              onClick={() => navigate("/edit-profile")}
            />
            <button
              onClick={() => setIsDeleteProfileModalOpen(true)}
              className="text-xl  cursor-pointer"
            >
              <BsFillTrash3Fill className=" cursor-pointer text-red-500" />
            </button>
          </div>

          {/* Edit & delete button on large screen */}
          <div className="hidden absolute lg:flex gap-x-4 right-6 top-5">
            <SecondaryButton
              text={
                <div className="flex items-center gap-x-2">
                  <BsPen />
                  <p>Edit</p>
                </div>
              }
              className="border-transparent dark:hover:!text-cta shadow-md"
              onClick={() => navigate("/edit-profile")}
            />
            <SecondaryButton
              text={
                <div className="flex justify-center items-center  gap-x-2">
                  <BsFillTrash3Fill className=" cursor-pointer " />
                  Delete
                </div>
              }
              onClick={() => setIsDeleteProfileModalOpen(true)}
              className="border-transparent dark:!border-2 shadow-md hover:bg-red-600 text-red-600 dark:text-white hover:!text-white dark:hover:!text-red-600"
            />
          </div>

          {/* Name, Username and Bio + Stat Count */}
          <div className="px-2">
            <p className="text-center text-3xl font-bold">{dbUser?.name}</p>
            <p className="mt-2 text-center text-xl font-medium">
              @{dbUser?.username}
            </p>
            {dbUser?.bio && (
              <p className="px-4 my-10 text-md text-center">{dbUser?.bio}</p>
            )}
          </div>

          {/* Separator */}
          <hr className="my-5 mx-2 dark:border-white/25" />

          {/* Day of joining */}
          <div className="mt-5 text-greyText flex justify-center items-center gap-x-2">
            <TfiWrite /> Became a Quizzer on{" "}
            {dayjs(new Date(dbUser?.createdAt)).format("MMM DD, YYYY")}.
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
