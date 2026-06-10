const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Manager } = require('erela.js');
const express = require('express');

// 1. Production Web Server for 24/7 Hosting uptime
const app = reportExpress => express();
app.get('/', (req, res) => res.send('Melodix Lavalink Engine: Active'));
app.listen(process.env.PORT || 3000, () => console.log('Web server initialized.'));

// 2. Initialize Discord Client with Strict Voice/Guild Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Updated High-Uptime Public Lavalink Node Configuration
const nodes = [
    {
        host: 'lavalink.lavaclient.xyz', // Updated to a highly stable, alternative free node
        port: 443,
        password: 'https://dsc.gg/ajdevserver',
        secure: true
    }
];

// Initialize Erela.js Manager
client.manager = new Manager({
    nodes,
    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    }
})
.on('nodeConnect', node => console.log(`[Lavalink] Connection established on: ${node.options.host}`))
.on('nodeError', (node, error) => console.log(`[Lavalink] Node error: ${error.message}`))
.on('trackStart', (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#00ffbb')
        .setTitle('🎶 Now Playing')
        .setDescription(`[${track.title}](${track.uri})`)
        .addFields(
            { name: 'Uploader', value: track.author, inline: true },
            { name: 'Duration', value: track.isStream ? '🔴 Live' : new Date(track.duration).toISOString().substr(11, 8), inline: true }
        )
        .setFooter({ text: 'Melodix Premium Enterprise Engine' })
        .setTimestamp();

    channel.send({ embeds: [embed] });
})
.on('queueEnd', player => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) channel.send('Queue is empty. Leaving voice channel...');
    player.destroy();
});

// 4. Raw Voice State Gateway Forwarding
client.on('raw', d => client.manager.updateVoiceState(d));

client.once('ready', () => {
    console.log(`System Check: Logged in as ${client.user.tag}`);
    client.manager.init(client.user.id);
});

// 5. Command Handler with '!!' Prefix
const PREFIX = '!!';

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    let content = message.content.trim();
    if (!content.toLowerCase().startsWith(PREFIX)) return;

    let commandBody = content.slice(PREFIX.length).trim();
    const args = commandBody.split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('❌ Please provide a song name or valid streaming link!');

        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) return message.reply('⚠️ You must join a voice channel first!');

        // Create player connection
        const player = client.manager.create({
            guild: message.guild.id,
            voiceChannel: voiceChannel.id,
            textChannel: message.channel.id,
            selfDeafen: true
        });

        if (player.state !== "CONNECTED") player.connect();

        try {
            const res = await client.manager.search(query, message.author);
            
            if (res.loadType === 'LOAD_FAILED') {
                if (!player.queue.current) player.destroy();
                return message.reply('❌ Lavalink failed to parse this track.');
            }
            if (res.loadType === 'NO_MATCHES') {
                if (!player.queue.current) player.destroy();
                return message.reply('❌ No results found for your query.');
            }

            if (res.loadType === 'PLAYLIST_LOADED') {
                player.queue.add(res.tracks);
                if (!player.playing && !player.paused && player.queue.totalSize === res.tracks.length) player.play();
                return message.reply(`🎶 Successfully queued playlist: **${res.playlist.name}** (${res.tracks.length} tracks).`);
            } else {
                player.queue.add(res.tracks[0]);
                if (!player.playing && !player.paused && !player.queue.size) player.play();
                return message.reply(`🔍 Added to queue: **${res.tracks[0].title}**`);
            }
        } catch (err) {
            console.error(err);
            message.reply('❌ An error occurred while searching for the track.');
        }
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
