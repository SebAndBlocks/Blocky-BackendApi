module.exports = (app, utils) => {
    app.get('/api/v1/users/profile', utils.cors(), async function (req, res) {
        const packet = req.query;

        const target = String(packet.target).toLowerCase();

        const username = String(packet.username).toLowerCase();
        const token = packet.token || "";

        let loggedIn = await utils.UserManager.loginWithToken(username, token);

        const target_data = await utils.UserManager.getUserData(target);
        const user_data = await utils.UserManager.getUserData(username);

        if (!target_data) {
            utils.error(res, 404, "NotFound")
            return;
        }

        let isMod = false;
        if (loggedIn)
            isMod = user_data.moderator || user_data.admin;

        if ((target_data.permBanned || target_data.unbanTime > Date.now()) && username !== target && !isMod) {
            utils.error(res, 404, "NotFound")
            return;
        }

        const privateProfile = target_data.privateProfile;
        const canFollowingSeeProfile = target_data.allowFollowingView;

        let user = {
            success: false,
            id: target_data.id,
            username: target,
            real_username: target_data.real_username,
            badges: [],
            donator: false,
            rank: 0,
            bio: "",
            myFeaturedProject: "",
            myFeaturedProjectTitle: "",
            followers: 0,
            canrankup: false,
            privateProfile,
            canFollowingSeeProfile,
            isFollowing: false,
        };

        const targetID = target_data.id;
        if (loggedIn) {
            const usernameID = await utils.UserManager.getIDByUsername(username);
            user.isFollowing = await utils.UserManager.isFollowing(usernameID, targetID);
        }

        if (privateProfile) {
            if (!loggedIn) {
                res.status(200);
                res.header("Content-Type", "application/json");
                res.send(user);
                return;
            }

            if (username !== target) {
                const usernameID = await utils.UserManager.getIDByUsername(username);
                const isFollowing = await utils.UserManager.isFollowing(usernameID, targetID);

                if (!isFollowing && !canFollowingSeeProfile && !isMod) {
                    res.status(200);
                    res.header("Content-Type", "application/json");
                    res.send(user);
                    return;
                }
            }
        }

        const badges = target_data.badges;
        const isDonator = badges.includes('donator');

        const rank = target_data.rank;

        const signInDate = target_data.firstLogin;

        const userProjects = await utils.UserManager.getProjectsByAuthor(targetID, 0, 3, true, true);

        const canRequestRankUp = ((userProjects.length >= 3) // if we have 3 projects and
            && ((Date.now() - signInDate) / 1000 >= 432000)) // first signed in 5 days ago
            || (badges.length > 0); // or we have a badge

        const followers = await utils.UserManager.getFollowerCount(target);

        const myFeaturedProject = await utils.UserManager.getFeaturedProject(target);
        const myFeaturedProjectTitle = await utils.UserManager.getFeaturedProjectTitle(target);

        const bio = await utils.UserManager.getBio(target);

        user = {
            success: true,
            id: targetID,
            username: target,
            real_username: target_data.real_username,
            badges,
            donator: isDonator,
            rank,
            bio,
            myFeaturedProject,
            myFeaturedProjectTitle,
            followers: followers,
            canrankup: canRequestRankUp && rank !== 1,
            privateProfile,
            canFollowingSeeProfile,
            isFollowing: user.isFollowing,
        };

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(user);
    });
}