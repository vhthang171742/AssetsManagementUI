import React, { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "config/msalConfig";

export default function SignIn() {
  const { instance, accounts, inProgress } = useMsal();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (accounts.length > 0) {
      navigate("/admin", { replace: true });
    }
  }, [accounts, navigate]);

  /**
   * Handle Microsoft Sign In
   */
  const handleSignIn = async () => {
    try {
      await instance.loginPopup({
        ...loginRequest,
        prompt: "consent",
      });
      navigate("/admin", { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="mt-16 mb-16 flex h-full w-full items-center justify-center px-2 md:mx-0 md:px-0 lg:mb-10 lg:items-center lg:justify-start">
      {/* Sign in section */}
      <div className="mt-[10vh] w-full max-w-full flex-col items-center md:pl-4 lg:pl-0 xl:max-w-[420px]">
        <h4 className="mb-2.5 text-4xl font-bold text-navy-700 dark:text-white">
          Welcome Back
        </h4>
        <p className="mb-9 ml-1 text-base text-gray-600 dark:text-gray-400">
          Sign in with your Microsoft account
        </p>

        {/* Microsoft Sign In Button */}
        <button
          onClick={handleSignIn}
          disabled={inProgress === "login"}
          className="mb-6 flex h-[50px] w-full items-center justify-center gap-3 rounded-xl bg-blue-600 transition duration-200 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          <svg
            className="h-6 w-6 fill-white"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 23 23"
          >
            <path d="M11.4 5.5h5.8v5.8h-5.8z" />
            <path d="M.8 5.5h5.8v5.8H.8z" />
            <path d="M11.4 17.4h5.8v5.8h-5.8z" />
            <path d="M.8 17.4h5.8v5.8H.8z" />
          </svg>
          <span className="text-sm font-medium text-white">
            {inProgress === "login" ? "Signing in..." : "Sign In with Microsoft"}
          </span>
        </button>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Using your organizational Microsoft account
          </p>
        </div>
      </div>
    </div>
  );
}
