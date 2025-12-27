import React from "react";
import { useAuth } from "context/AuthContext";
import banner from "assets/img/profile/banner.png";
import Card from "components/card";

const Banner = () => {
  const { userProfile, userPhoto } = useAuth();

  // Use profile data or fallback to defaults
  const displayName = userProfile?.displayName || "User";
  const department = userProfile?.department || "Department";
  const avatarUrl = userPhoto || "https://via.placeholder.com/87x87?text=User";

  return (
    <Card extra={"items-center w-full h-full p-[16px] bg-cover"}>
      {/* Background and profile */}
      <div
        className="relative mt-1 flex h-32 w-full justify-center rounded-xl bg-cover"
        style={{ backgroundImage: `url(${banner})` }}
      >
        <div className="absolute -bottom-12 flex h-[87px] w-[87px] items-center justify-center rounded-full border-[4px] border-white bg-pink-400 dark:!border-navy-700">
          <img 
            className="h-full w-full rounded-full object-cover" 
            src={avatarUrl} 
            alt={displayName} 
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/87x87?text=User";
            }}
          />
        </div>
      </div>

      {/* Name and position */}
      <div className="mt-16 flex flex-col items-center">
        <h4 className="text-xl font-bold text-navy-700 dark:text-white">
          {displayName}
        </h4>
        <p className="text-base font-normal text-gray-600 dark:text-gray-400">
          {department}
        </p>
      </div>

      {/* Post followers */}
      <div className="mt-6 mb-3 flex gap-4 md:!gap-14">
        <div className="flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-navy-700 dark:text-white">—</p>
          <p className="text-sm font-normal text-gray-600 dark:text-gray-400">Posts</p>
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-navy-700 dark:text-white">—</p>
          <p className="text-sm font-normal text-gray-600 dark:text-gray-400">Followers</p>
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-navy-700 dark:text-white">—</p>
          <p className="text-sm font-normal text-gray-600 dark:text-gray-400">Following</p>
        </div>
      </div>
    </Card>
  );
};

export default Banner;
