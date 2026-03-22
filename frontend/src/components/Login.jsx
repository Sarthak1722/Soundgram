import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import {setauthUser} from '../redux/userSlice.js';
const API_URL = import.meta.env.VITE_API_URL;


const Login = () => {
  const [userData, setUserData] = useState({
    userName: "",
    password: "",
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setUserData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // prevents page refresh
    if(!userData.userName || !userData.password) {
        return toast.error("All fields are required");
    }
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/user/login`,
        userData,
        { withCredentials: true },
      );

      dispatch(setauthUser(res.data));
      
      if (res.data.success) {
        setUserData({
          userName: "",
          password: "",
        });
        toast.success(res.data.message);
        navigate("/homepage");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="min-w-96 w-full max-w-md mx-auto">
      <div className="w-full p-6 rounded-lg shadow-md bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-10 border border-gray-100">
        <h1 className="text-3xl font-bold text-center text-black-300">Login</h1>
        <form action="" onSubmit={handleSubmit}>
          <div>
            <label className="label p-2">
              <span className="text-base label-text">Username</span>
            </label>
            <input
              className="w-full input input-bordered h-10"
              type="text"
              name="userName"
              value={userData.userName}
              autoComplete="userName"
              onChange={handleChange}
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
              autoComplete="new-password"
              onChange={handleChange}
            />
          </div>

          <div className="my-2 flex align-middle">
            <p className="">Don't have an account?</p>
            <Link to="/register" className="mx-4">
              Signup
            </Link>
          </div>

          <div className="my-1">
            <button
              type="submit"
              className="btn btn-block btm-sm mt-2 border border-slate-700"
            >
              Login
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default Login;
