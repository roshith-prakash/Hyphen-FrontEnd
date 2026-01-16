import { Link } from "react-router-dom";
import { Twitter, Github, Mail, GithubIcon } from "lucide-react";
import { useDBUser } from "@/context/UserContext";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { dbUser } = useDBUser();

  return (
    <footer className="bg-secondarydarkbg border-t-4 border-darkmodetext/25 relative mt-20 pt-20 pb-12 text-darkmodetext">
      {/* Main Footer Content */}
      <div className="container mx-auto px-10">
        <div
          className={`grid grid-cols-1 md:grid-cols-2  ${
            dbUser ? "lg:grid-cols-4" : "lg:grid-cols-3"
          } gap-10`}
        >
          {/* Brand Column */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://res.cloudinary.com/dvwdsxirc/image/upload/v1768573368/logo_ykew3c.png"
                alt="Safezone"
                className="h-16 w-16 object-contain"
              />
              <h2 className="text-5xl font-bold font-title tracking-wider">
                Safezone
              </h2>
            </div>
            <div className="text-center md:text-left">
              <p className="text-lg text-darkmodetext/80">
                Seamless attendance tracking and timetable management for students.
              </p>
            </div>
            <div className="flex mt-8 space-x-4">
              <a
                href="https://x.com/roshith_prakash"
                className="text-darkmodetext hover:text-white transition-colors"
              >
                <Twitter size={20} />
                <span className="sr-only">Twitter</span>
              </a>

              <a
                href="https://github.com/roshith-prakash"
                className="text-darkmodetext hover:text-white transition-colors"
              >
                <Github size={20} />
                <span className="sr-only">GitHub</span>
              </a>
            </div>
          </div>

          {/* Sign up / sign in */}
          {!dbUser && (
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-center md:text-left">
                Get Started
              </h3>
              <ul className="space-y-2 text-center md:text-left">
                <li>
                  <Link
                    to="/signup"
                    className="text-darkmodetext/80 hover:text-white transition-colors"
                  >
                    Sign up
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signin"
                    className="text-darkmodetext/80 hover:text-white transition-colors"
                  >
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {dbUser && (
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-center md:text-left">
                Features
              </h3>
              <ul className="space-y-2 text-center md:text-left">
                <li>
                  <Link
                    to="/attendance"
                    className="text-darkmodetext/80 hover:text-white transition-colors"
                  >
                    Attendance Tracking
                  </Link>
                </li>
                <li>
                  <Link
                    to="/profile"
                    className="text-darkmodetext/80 hover:text-white transition-colors"
                  >
                    Timetable Management
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Contact Column */}
          <div>
            <h3 className="text-2xl font-semibold mb-4 text-center md:text-left">
              Contact Us
            </h3>
            <div className="space-y-4 text-center md:text-left">
              <a
                href="mailto:roshithprakash07@gmail.com"
                className="flex flex-col md:flex-row md:items-center gap-2"
              >
                <Mail size={18} className="mx-auto md:mx-0" />
                <span className="text-darkmodetext/80">
                  roshithprakash07@gmail.com
                </span>
              </a>
              <a
                href="https://github.com/roshith-prakash"
                target="_blank"
                className="flex flex-col md:flex-row md:items-center gap-2"
              >
                <GithubIcon size={18} className="mx-auto md:mx-0" />
                <span className="text-darkmodetext/80">roshith-prakash</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-darkmodetext/10 mt-8 pt-8 text-center text-darkmodetext/60 text-sm">
          <p>© {currentYear} Safezone. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
