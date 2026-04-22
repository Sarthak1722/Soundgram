import { useEffect } from "react";
import { useDispatch } from "react-redux";
import ChatSidebar from "../components/ChatSidebar.jsx";
import MessageContainer from "../components/MessageContainer.jsx";
import useGetOtherUsers from "../hooks/useGetOtherUsers.jsx";
import { clearSelectedRoomChat, setRoomsList } from "../redux/roomsSlice.js";
import { useSelector } from "react-redux";
import { listRooms } from "../api/roomsApi.js";

const MessagesPage = () => {
  const dispatch = useDispatch();
  const selectedUser = useSelector((store) => store.user.selectedUser);
  const hasOpenThread = Boolean(selectedUser?._id);
  useGetOtherUsers();

  useEffect(() => {
    dispatch(clearSelectedRoomChat());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;

    const loadRooms = async () => {
      try {
        const rooms = await listRooms();
        if (!cancelled) {
          dispatch(setRoomsList(rooms));
        }
      } catch (error) {
        console.error("Failed to load rooms", error);
      }
    };

    void loadRooms();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className={`${hasOpenThread ? "hidden lg:flex" : "flex"} min-h-0 min-w-0 w-full lg:w-auto`}>
        <ChatSidebar />
      </div>
      <div className={`${hasOpenThread ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-1`}>
        <MessageContainer />
      </div>
    </div>
  );
};

export default MessagesPage;
