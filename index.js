const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Poru } = require('poru');
const express = require('express');

// 1. Web Server for Hosting
const app = express();
app.get('/', (req, res) => res.send('Lavalink Bot is Online!'));
app.listen(process.env.PORT || 3000);

// 2. Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Lavalink Nodes Configuration (Free Public Node)
const nodes = [
    {
        name: 'Main-Node',
        host: 'lavalink.jonathansk.com',
        port: 443,
        password: 'https://dsc.gg/ajdevserver',
        secure: true
    }
];

// Initialize Poru
client.poru = new Poru(client, nodes, {
    apple: true,
    spotify: true
});

// Lavalink Event Listeners
client.poru.on('nodeConnect', (node) => console.log(`🎵 Lavalink Node "${node.name}" Connected!`));
client.poru.on('nodeError', (node, error) => console.log(`❌ Lavalink Node Error: ${error.message}`));

const playerStartHandler = (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#00ffbb')
        .setTitle('🎶 Now Playing')
        .setDescription(`[${track.info.title}](${track.info.uri})`)
        .addFields(
            { name: 'Author', value: track.info.author, inline: true },
            { name: 'Source', value: track.info.isStream ? 'Live Stream' : 'Lavalink Engine', inline: true }
        )
        .setFooter({ text: 'Melodix Lavalink Edition' });

    channel.send({ embeds: [embed] });
};
client.poru.on('trackStart', playerStartHandler);

// Voice Update Handler
client.on('raw', (d) => client.poru.packetRouter(d));

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.poru.init(client);
});

// 4. Command Handler with 'koi' Prefix
const PREFIX = 'koi'; // এখানে নতুন প্রিফিক্স 'koi' সেট করা হয়েছে

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    // প্রিফিক্স চেক করার পর কমান্ড আলাদা করা (koiplay -> play)
    const commandBody = message.content.slice(PREFIX.length).trim();
    const args = commandBody.split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Please provide a song name or link!');

        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) return message.reply('You need to join a voice channel first!');

        const player = client.poru.createConnection({
            guildId: message.guild.id,
            voiceChannel: voiceChannel.id,
            textChannel: message.channel.id,
            deaf: true
        });

        const resolve = await client.poru.resolve(query);
        
        if (resolve.loadType === 'LOAD_FAILED' || resolve.loadType === 'NO_MATCHES') {
            return message.reply('❌ No results found on Lavalink Node.');
        }

        if (resolve.loadType === 'PLAYLIST_LOADED') {
            for (const track of resolve.tracks) {
                player.queue.add(track);
            }
            message.reply(`🎶 Added playlist **${resolve.playlistInfo.name}** (${resolve.tracks.length} songs).`);
            if (!player.isPlaying) player.play();
        } else {
            const track = resolve.tracks[0];
            player.queue.add(track);
            message.reply(`🔍 Added to queue: **${track.info.title}**`);
            if (!player.isPlaying) player.play();
        }
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
