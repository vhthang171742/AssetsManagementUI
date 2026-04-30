import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "config/msalConfig";
import { ReactComponent as MicrosoftLogo } from "assets/svg/microsoft_logo.svg";

export default function SignIn() {
  const { instance, accounts, inProgress } = useMsal();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState("");
  const isMobileBrowser = /Android|iPhone|iPad|iPod|Mobile/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (accounts.length > 0) {
      navigate("/", { replace: true });
    }
  }, [accounts, navigate]);

  /**
   * Handle Microsoft Sign In
   */
  const handleSignIn = async () => {
    if (inProgress !== "none") {
      return;
    }

    setLoginError("");

    const hasWebCrypto = Boolean(
      typeof window !== "undefined" && window.crypto?.subtle
    );
    const isSecureContextAvailable =
      typeof window !== "undefined" ? window.isSecureContext : false;

    if (!hasWebCrypto || !isSecureContextAvailable) {
      setLoginError(
        "This browser cannot create a secure PKCE login request. Open this site in Chrome/Safari (not in-app browser) and ensure HTTPS."
      );
      return;
    }

    try {
      await instance.loginRedirect({
        ...loginRequest,
      });
      // Note: After redirect, the user will be returned to the app by MsalProvider
      // No need to navigate here as the redirect will handle the return
    } catch (error) {
      const errorCode = error?.errorCode || "unknown_error";
      const errorMessage = error?.message || "Unknown sign-in error";
      console.error("Login redirect failed:", errorCode, errorMessage, error);

      // Some mobile contexts block redirect navigation. Try popup as fallback.
      if (isMobileBrowser) {
        try {
          await instance.loginPopup({
            ...loginRequest,
          });
          navigate("/", { replace: true });
          return;
        } catch (popupError) {
          console.error("Login popup fallback failed:", popupError);
        }
      }

      if (errorCode === "interaction_in_progress") {
        setLoginError("Sign-in is already in progress. Please wait a few seconds and try again.");
        return;
      }

      if (errorCode === "pkce_not_created") {
        setLoginError(
          "PKCE generation failed on this mobile browser. Open the app in Chrome/Safari (outside in-app browser), then try again."
        );
        return;
      }

      setLoginError(
        `Unable to start Microsoft sign-in (${errorCode}). Try opening in Chrome/Safari and sign in again.`
      );
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
          disabled={inProgress !== "none"}
          className="mb-6 flex h-[50px] w-full items-center justify-center gap-3 rounded-xl bg-blue-600 transition duration-200 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          <MicrosoftLogo className="h-5 w-5" />
          <span className="text-sm font-medium text-white">
            {inProgress !== "none" ? "Preparing sign-in..." : "Sign In with Microsoft"}
          </span>
        </button>

        {loginError && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{loginError}</p>
        )}

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Using your organizational Microsoft account
          </p>
        </div>
      </div>
    </div>
  );
}
