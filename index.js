const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { LavalinkManager } = require('lavalink-client');
const express = require('express');

// 1. Production Web Server for 24/7 Hosting Uptime
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

// 3. Ultra Stable Public Lavalink Node Array
const nodes = [{
    host: 'lavalink.lavaclient.xyz',
    port: 443,
    authorization: 'https://dsc.gg/ajdevserver',
    secure: true
}];

// Initialize Lavalink Manager
client.lavalink = new LavalinkManager({
    nodes,
    sendGatewayPayload: (id, payload) => {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    }
});

// Event Handlers
client.lavalink.nodeManager.on('connect', (node) => console.log(`[Lavalink] Connected to node: ${node.options.host}`));
client.lavalink.nodeManager.on('error', (node, error) => console.log(`[Lavalink] Error on node ${node.options.host}:`, error.message));

client.lavalink.on('trackStart', (player, track) => {
    const channel = client.channels.cache.get(player.textChannelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#00ffbb')
        .setTitle('🎶 Now Playing')
        .setDescription(`[${track.info.title}](${track.info.uri})`)
        .addFields(
            { name: 'Uploader', value: track.info.author || 'Unknown', inline: true },
            { name: 'Duration', value: track.info.isStream ? '🔴 Live' : new Date(track.info.duration).toISOString().substr(11, 8), inline: true }
        )
        .setFooter({ text: 'Melodix Audio Cluster' })
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

client.lavalink.on('queueEnd', (player) => {
    const channel = client.channels.cache.get(player.textChannelId);
    if (channel) channel.send('Queue is empty. Vacating voice channel...');
    player.destroy();
});

// Forward Voice Gateway Events Directly
client.on('raw', (d) => client.lavalink.sendRawGatewayPayload(d));

client.once('ready', () => {
    console.log(`System Check: Gateway verified for ${client.user.tag}`);
    client.lavalink.init({ id: client.user.id });
});

// 4. Command Parser Engine ('!!')
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
            let player = client.lavalink.players.get(message.guild.id);
            
            if (!player) {
                player = await client.lavalink.createPlayer({
                    guildId: message.guild.id,
                    voiceChannelId: voiceChannel.id,
                    textChannelId: message.channel.id,
                    selfDeafen: true
                });
                await player.connect();
            }

            const res = await player.search({ query }, message.author);
            
            if (!res.tracks || !res.tracks.length) {
                if (!player.queue.current) player.destroy();
                return message.reply('❌ Query returned no active matches.');
            }

            if (res.loadType === 'playlist') {
                for (let track of res.tracks) player.queue.add(track);
                if (!player.playing && !player.paused) await player.play();
                return message.reply(`🎶 Queued playlist: **${res.playlist.name}** (${res.tracks.length} tracks).`);
            } else {
                player.queue.add(res.tracks[0]);
                if (!player.playing && !player.paused) await player.play();
                return message.reply(`🔍 Added to queue: **${res.tracks[0].info.title}**`);
            }
        } catch (err) {
            console.error(err);
            message.reply('❌ An error occurred while resolving your search query.');
        }
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
