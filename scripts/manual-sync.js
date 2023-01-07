const { Client, Events, GatewayIntentBits, Partials } = require("discord.js");
const { token, Api_Key, Api_Username } = require("../config.json");
const { addRemoveRole } = require("../utils.js");
const axios = require("axios");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  // Need to intialize Partials.GuildMember otherwise guildMemberUpdate
  // will not fire for uncached members...
  //
  // Otherwise this behavior:
  // When the bot first starts up, the first update to a guild member (which
  // should fire guildMemberUpdate) does not happen.

  partials: [Partials.GuildMember],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  const guild = c.guilds.cache.get("1039885252920873052");

  console.log(`guilds: ${guild}`);

  // https://stackoverflow.com/questions/70282579/how-to-get-all-of-the-members-of-a-guild-with-a-certain-role-in-discord-js-v13
  guild.members
    .fetch()
    .then(async (members) => {
      // Fetch all members with a certain role in discord
      const role = guild.roles.cache.find((r) => r.name === "Citizen"); //the role to check
      const roleMembers = members.filter((m) => m.roles.cache.has(role.id)); // array of user IDs who have the role

      const discordRoleMembers = roleMembers.map((m) => m.user.username);

      // get all members from discourse group

      const getConfig = {
        method: "get",
        url: "https://forum.citydao.io/groups/discord_citizen/members.json",
        header: {
          "Api-Key":
            "d57dc8c725f0d37cdca9fb6a53dfd310a40359695469811c077cc84ec318167e",
          "Api-Username": "system",
          "Content-Type": "application/json",
        },
      };

      const respone = await axios(getConfig);

      const discourseMembers = respone.data.members.map((m) => m.username);

      // delete all members from discourse group that are not in the discord

      const deleteRoles = discourseMembers
        .filter((x) => !discordRoleMembers.includes(x))
        .join(",");

      const data = JSON.stringify({
        usernames: deleteRoles,
      });

      if (deleteRoles) {
        const deleteConfig = {
          method: "delete",
          url: "https://forum.citydao.io/groups/77/members.json",
          headers: {
            "Api-Key":
              "d57dc8c725f0d37cdca9fb6a53dfd310a40359695469811c077cc84ec318167e",
            "Api-Username": "system",
            "Content-Type": "application/json",
          },
          data: data,
        };

        const response = await axios(deleteConfig);
      }

      // Add discourse group membership

      const addRoles = discordRoleMembers.filter(
        (x) => !discourseMembers.includes(x)
      );
      for (const memberName of addRoles) {
        const data = JSON.stringify({
          usernames: memberName,
        });

        const putConfig = {
          method: "put",
          url: "https://forum.citydao.io/groups/77/members.json",
          headers: {
            "Api-Key":
              "d57dc8c725f0d37cdca9fb6a53dfd310a40359695469811c077cc84ec318167e",
            "Api-Username": "system",
            "Content-Type": "application/json",
          },
          data: data,
        };

        const response = await axios(putConfig);
      }
    })

    .catch(console.error);
});

client.login(token);

// TODO: Convert Promise to Async/Await
