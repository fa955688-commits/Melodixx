const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Connectors } = require('shoukaku');
const { Kazagumo } = require('kazagumo');
const express = require('express');

// 1. Production Web Server for 24/7 Hosting uptime
const app = express();
app.get('/', (req, res) => res.send('Melodix Cluster: Active'));
app.listen(process.env.PORT || 3000, () => console.log('Web server initialized.'));

// 2. Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. High-Uptime Public Lavalink Node Configuration
const Nodes = [{
    name: 'Production-Node',
    url: 'lavalink.lavaclient.xyz:443',
    auth: 'https://dsc.gg/ajdevserver',
    secure: true
}];

// Initialize Shoukaku Connector
const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, {
    moveOnDisconnect: true,
    resume: true
});

// Initialize Kazagumo Player Manager
client.manager = new Kazagumo({
    defaultSearchEngine: 'youtube',
    send: (id, payload) => {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    }
}, shoukaku);

// Lavalink Event Listeners
client.manager.shoukaku.on('ready', (name) => console.log(`[Lavalink] Node "${name}" connected successfully.`));
client.manager.shoukaku.on('error', (name, error) => console.log(`[Lavalink] Node "${name}" encountered an error: ${error.message}`));

client.manager.on('playerStart', (player, track) => {
    const channel = client.channels.cache.get(player.textId);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#00ffbb')
        .setTitle('🎶 Now Playing')
        .setDescription(`[${track.title}](${track.uri})`)
        .addFields(
            { name: 'Uploader', value: track.author || 'Unknown', inline: true },
            { name: 'Duration', value: track.isStream ? '🔴 Live' : new Date(track.length).toISOString().substr(11, 8), inline: true }
        )
        .setFooter({ text: 'Melodix Premium Modern Engine' })
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

client.manager.on('queueEmpty', (player) => {
    const channel = client.channels.cache.get(player.textId);
    if (channel) channel.send('Queue is empty. Vacating voice channel...');
    player.destroy();
});

client.once('ready', () => {
    console.log(`System Check: Gateway verified for ${client.user.tag}`);
});

// 4. Command Handler with '!!' Prefix
const PREFIX = '!!';

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    let content = message.content.trim();
    if (!content.startsWith(PREFIX)) return;

    let commandBody = content.slice(PREFIX.length).trim();
    const args = commandBody.split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('❌ Provide a track title or valid URL.');

        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) return message.reply('⚠️ You must occupy a voice channel first.');

        try {
            let player = client.manager.players.get(message.guild.id);
            
            if (!player) {
                player = await client.manager.createPlayer({
                    guildId: message.guild.id,
                    voiceId: voiceChannel.id,
                    textId: message.channel.id,
                    deafen: true
                });
            }

            const res = await client.manager.search(query);
            
            if (!res.tracks.length) {
                if (!player.queue.current) player.destroy();
                return message.reply('❌ Query returned no active matches.');
            }

            if (res.type === 'PLAYLIST') {
                for (let track of res.tracks) player.queue.add(track);
                if (!player.playing && !player.paused) player.play();
                return message.reply(`🎶 Queued playlist: **${res.playlistName}** (${res.tracks.length} tracks).`);
            } else {
                player.queue.add(res.tracks[0]);
                if (!player.playing && !player.paused) player.play();
                return message.reply(`🔍 Added to queue: **${res.tracks[0].title}**`);
            }
        } catch (err) {
            console.error(err);
            message.reply('❌ An error occurred while resolving your search query.');
        }
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
