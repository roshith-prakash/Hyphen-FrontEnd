import { SecondaryButton } from "@/components";
import { auth } from "@/firebase/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const Signout = () => {
  const navigate = useNavigate();

  // Firebase User.
  const { currentUser } = useAuth();

  // Scroll to the top of page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Set window title.
  useEffect(() => {
    document.title = "Sign out | Safezone";
  }, []);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate("/");
      })
      .catch((error) => {
        console.log(error);
      });
  };

  // If user hasn't signed in using firebase
  if (!currentUser) {
    return (
      <div className="dark:bg-darkbg dark:text-darkmodetext h-screen">
        <div className="min-h-[70vh] md:min-h-[65vh] dark:bg-darkbg dark:text-darkmodetext lg:min-h-[60vh] flex items-center justify-center pt-12 pb-32">
          <div>
            {/* Title for page */}
            <p className="text-3xl lg:text-4xl px-5 text-center mt-14">
              You have not signed in!
            </p>
            <div className="mt-10 flex flex-col gap-10 justify-center items-center">
              {/* Image */}
              <img
                src={
                  "https://res.cloudinary.com/do8rpl9l4/image/upload/v1736738810/notfound_eqfykw.svg"
                }
                className="max-w-[50%] lg:max-w-[40%] pointer-events-none"
              />
              {/* Button to navigate back to home page */}
              <div>
                <SecondaryButton
                  onClick={() => navigate("/signup")}
                  text="Sign up"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-[89vh] py-16 gap-10 flex flex-col justify-center items-center pb-24">
        {/* Title */}
        <h1 className="text-3xl lg:text-4xl font-medium">
          Do you want to sign out?
        </h1>
        {/* Image */}
        <img
          src={
            "https://res.cloudinary.com/do8rpl9l4/image/upload/v1736741825/signout_xm5pl2.svg"
          }
          className="max-w-[35%] -translate-x-2 lg:max-w-[20%] pointer-events-none"
        />
        {/* Button to log out */}
        <div>
          <SecondaryButton
            className="px-10"
            onClick={handleLogout}
            text={"Sign Out"}
          />
        </div>
      </div>
    </>
  );
};

export default Signout;
