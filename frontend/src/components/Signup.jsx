import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL;

const Signup = () => {
  const [userData, setUserData] = useState({
    fullName: "",
    userName: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setUserData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !userData.fullName ||
      !userData.userName ||
      !userData.password ||
      !userData.confirmPassword ||
      !userData.gender
    ) {
      return toast.error("All fields are required");
    }
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/user/register`,
        userData,
        { withCredentials: true },
      );
      if (res.data.success) {
        setUserData({
          fullName: "",
          userName: "",
          password: "",
          confirmPassword: "",
          gender: "",
        });
        toast.success(res.data.message);
        navigate("/");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="min-w-96 w-full max-w-md mx-auto">
      <div className="w-full p-6 rounded-lg shadow-md bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-10 border border-gray-100">
        <h1 className="text-3xl font-bold text-center text-black-300">
          Signup
        </h1>
        <form action="" onSubmit={handleSubmit}>
          <div>
            <label className="label p-2">
              <span className="text-base label-text">Full Name</span>
            </label>
            <input
              className="w-full input input-bordered h-10"
              type="text"
              name="fullName"
              value={userData.fullName}
              onChange={handleChange}
              autoComplete="name"
            />
          </div>

          <div>
            <label className="label p-2">
              <span className="text-base label-text">Username</span>
            </label>
            <input
              className="w-full input input-bordered h-10"
              type="text"
              name="userName"
              value={userData.userName}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="label p-2">
              <span className="text-base label-text">Password</span>
            </label>
            <input
              className="w-full input input-bordered h-10"
              type="password"
              name="password"
              value={userData.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="label p-2">
              <span className="text-base label-text">Confirm Password</span>
            </label>
            <input
              className="w-full input input-bordered h-10"
              type="password"
              name="confirmPassword"
              value={userData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-center my-4">
            <div className="flex items-center">
              <p>Male</p>
              <input
                type="radio"
                className="checkbox mx-2"
                name="gender"
                value="male"
                checked={userData.gender === "male"}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center">
              <p>Female</p>
              <input
                type="radio"
                className="checkbox mx-2"
                name="gender"
                value="female"
                checked={userData.gender === "female"}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="my-2 flex align-middle">
            <p className="">Already have an account?</p>
            <Link to="/" className="mx-4">
              Login
            </Link>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-block btm-sm mt-2 border border-slate-700"
            >
              Signup
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default Signup;
