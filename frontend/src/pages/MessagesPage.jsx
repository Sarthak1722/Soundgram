import ChatSidebar from "../components/ChatSidebar.jsx";
import MessageContainer from "../components/MessageContainer.jsx";

const MessagesPage = () => {
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <ChatSidebar />
      <MessageContainer />
    </div>
  );
};

export default MessagesPage;
