import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IoArrowForward,
  IoLockClosedOutline,
  IoPersonOutline,
  IoSparklesOutline,
} from "react-icons/io5";
import AuthShell from "./auth/AuthShell.jsx";
import { authInputClassName, authLabelClassName } from "./auth/authFormStyles.js";
import apiClient from "../api/client.js";

const Signup = () => {
  const [userData, setUserData] = useState({
    fullName: "",
    userName: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setUserData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { fullName, userName, password, confirmPassword } = userData;

    if (!fullName.trim() || !userName.trim() || !password || !confirmPassword) {
      toast.error("Fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      toast.error("Use at least 6 characters for your password.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await apiClient.post("/api/v1/user/register", {
        fullName: fullName.trim(),
        userName: userName.trim(),
        password,
        confirmPassword,
      });

      setUserData({
        fullName: "",
        userName: "",
        password: "",
        confirmPassword: "",
      });
      toast.success(res.data.message || "Account created.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create your account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start your first jam in minutes."
      description="Create your profile to unlock synced listening, private group jams, and a more personal home feed."
      footerPrompt="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkTo="/"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="fullName" className={authLabelClassName}>
            Full name
          </label>
          <div className="relative">
            <IoSparklesOutline className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="fullName"
              className={`${authInputClassName} pl-11`}
              type="text"
              name="fullName"
              value={userData.fullName}
              onChange={handleChange}
              autoComplete="name"
              placeholder="How should people know you?"
            />
          </div>
        </div>

        <div>
          <label htmlFor="userName" className={authLabelClassName}>
            Username
          </label>
          <div className="relative">
            <IoPersonOutline className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="userName"
              className={`${authInputClassName} pl-11`}
              type="text"
              name="userName"
              value={userData.userName}
              onChange={handleChange}
              autoComplete="username"
              placeholder="Choose a unique @handle"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className={authLabelClassName}>
              Password
            </label>
            <div className="relative">
              <IoLockClosedOutline className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="password"
                className={`${authInputClassName} pl-11`}
                type="password"
                name="password"
                value={userData.password}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className={authLabelClassName}>
              Confirm password
            </label>
            <div className="relative">
              <IoLockClosedOutline className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="confirmPassword"
                className={`${authInputClassName} pl-11`}
                type="password"
                name="confirmPassword"
                value={userData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Repeat your password"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-400">
          Your profile photo is generated automatically for now, so account creation stays quick and friction-free.
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create account"}
          {!submitting ? <IoArrowForward className="text-base" /> : null}
        </button>
      </form>
    </AuthShell>
  );
};

export default Signup;
