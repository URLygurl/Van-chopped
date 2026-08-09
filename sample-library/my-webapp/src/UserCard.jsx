// Displays a user's avatar and name.
import { useState, useEffect } from 'react';
export default function UserCard({ user }) {
  const [online, setOnline] = useState(false);
  useEffect(() => {}, []);
  return <div className="user-card">{user.name}</div>;
}