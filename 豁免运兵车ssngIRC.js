// 2026.3.15
// by Bi_Diu & Claude & ChatGPT
// 使用JsMacros模组加载
// 我是玩rpg的，经常用JsMacros写脚本
// 这个豁免运兵车非常适合用JsMacros写，方便修改也方便分发，就心血来潮写了这个
// 有不少aicode，但大部分debug和优化都是我自己做的。别笑我赫赫
// o((>ω< ))o


const scriptName = "SSNG-irc 豁免运兵车"
GlobalVars.toggleBoolean(scriptName);
if (isEnabled()) {
    Chat.log(`§7[§b${scriptName}§7] §2Enabled`);
} else {
    Chat.log(`§7[§b${scriptName}§7] §4Disabled`);
    JsMacros.disableScriptListeners();
}

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let currentLogLevel = LOG_LEVELS.debug; // 改这个.后面的，来调整输出的日志等级，如改成LOG_LEVELS.debug
const logPrefix = "[§e运兵§f] ";

// --------- 玩法配置表 ---------
const GAMEMODES = {
    // SW玩法
    'sw1': { type: 'sw', npc: [308, 45, -93], needsClick: false },
    'sw2': { type: 'sw', npc: [312, 44, -90], needsClick: false },
    'swwzy': { type: 'sw', npc: [304, 44, -90], needsClick: false },
    'xyzz1': { type: 'sw', npc: [316, 44, -89], needsClick: true, clickSlot: 21, screenName: "幸运之柱" },
    'xyzz2': { type: 'sw', npc: [316, 44, -89], needsClick: true, clickSlot: 23, screenName: "幸运之柱" },
    // BW玩法
    'bw8-1': { type: 'bw', npc: [-388, 41, -69], needsClick: false },
    'bw8-2': { type: 'bw', npc: [-384, 41, -70], needsClick: false },
    'bw4-4': { type: 'bw', npc: [-380, 41, -71], needsClick: false },
    'bwxp4-8': { type: 'bw', npc: [-376, 41, -70], needsClick: true, clickSlot: 20, screenName: "起床战争经验模式" },
    'bwxp8-4': { type: 'bw', npc: [-376, 41, -70], needsClick: true, clickSlot: 22, screenName: "起床战争经验模式" },
    'bwxp32-32': { type: 'bw', npc: [-376, 41, -70], needsClick: true, clickSlot: 24, screenName: "起床战争经验模式" },
    'bwwuhuo': { type: 'bw', npc: [-372, 41, -69], needsClick: false },
    // 其他玩法（职业战争等）
    'zyzz': { type: 'zyzz' }
};

// --------- 工具函数 ---------
function isEnabled() {
    return GlobalVars.getBoolean(scriptName);
}

const logging = true;
function log(msg, level = "info") {
    if (!Player.getPlayer()) { Client.waitTick(1); return; }
    if (!logging) return;
    const lvl = LOG_LEVELS[level] ?? LOG_LEVELS.info;
    if (lvl < currentLogLevel) return;

    let prefix = logPrefix;
    let color = "§7";
    if (level === "warn") color = "§e";
    if (level === "error") color = "§c";
    if (level === "debug") color = "§8";

    Chat.log(`${prefix}${color}[${level.toUpperCase()}]§r ${msg}`);
}

function safeSleep(time) {
    if (time <= 0) return;

    const interval = 50;
    let elapsed = 0;

    while (elapsed + interval <= time) {
        if (!isEnabled()) {
            return;
        }
        Time.sleep(interval);
        elapsed += interval;
    }

    // 处理不能被interval整除的剩余时间
    const remaining = time - elapsed;
    if (remaining > 0 && isEnabled()) {
        Time.sleep(remaining);
    }
}

function waitScreen(name, timeout = 2000) {
    const startTime = Date.now();
    const names = Array.isArray(name) ? name : [name];

    while (isEnabled() && Date.now() - startTime < timeout) {
        if (!Player.getPlayer()) return false;
        const title = Player.openInventory()?.getContainerTitle();
        if (names.some((n) => title.includes(n))) return true;
        Time.sleep(20);
    }

    log(`等待界面超时: ${name}`, "error");
    return false;
}

function waitUntil(condition, timeout = 5000) {
    const startTime = Date.now();
    while (isEnabled() && Date.now() - startTime < timeout) {
        if (!Player.getPlayer()) { Client.waitTick(1); continue; }
        if (condition()) return true;
        Time.sleep(20);
    }
    log(`等待条件超时 (${timeout}ms)`, "warn");
    return false;
}

function switchHotbar(index) {
    if (!Player.getPlayer()) return;
    if (Player.openInventory()?.getSelectedHotbarSlotIndex() !== index) {
        Player.openInventory()?.setSelectedHotbarSlotIndex(index)
    }
}

function isInHub() {
    if (!Player.getPlayer()) return false;
    try {
        const inv = Player.openInventory();
        if (!inv) return false;
        const title = inv.getContainerTitle();
        if (title === "合成" && inv.getSlot(44)?.getName()?.getString()?.includes("选择大厅")) {
            return true
        } else {
            return false;
        }
    } catch (e) {
        log(`isInHub()异常: ${e.message}`, "debug");
        return false;
    }
}

function isInSWHub() {
    if (!Player.getPlayer()) return false;
    if (isInHub() && Player.getPlayer().distanceTo(308, 46, -55) < 7) return true;
    // log("不在空岛大厅", "info")
    return false;
}

function isInBWHub() {
    if (!Player.getPlayer()) return false;
    if (isInHub() && Player.getPlayer().distanceTo(-380, 43, -37) < 7) return true;
    // log("不在起床大厅", "info")
    return false;
}

function isInSW() {
    if (!Player.getPlayer()) return false;
    if (!World.isWorldLoaded()) return false;
    try {
        // 方法 1
        for (let i = 0; i <= 3; i++) {
            if (Chat.getHistory().getRecvLine(i)?.getText()?.getString()?.includes(" 加入了游戏 ")) {
                log("通过聊天消息检测，确认在SW中", "debug");
                return true;
            }
        }

        // 方法 2
        if (checkSurroundingChunkLoaded(0) && World.getBlock(Math.floor(Player.getPlayer().getPos().getX()), Math.floor(Player.getPlayer().getPos().getY()) - 1, Math.floor(Player.getPlayer().getPos().getZ()))?.getId() === "minecraft:glass") {
            log("通过方块检测，确认在SW中", "debug");
            return true;
        }

        // 方法 3
        const inv = Player.openInventory();
        if (!inv) return false;
        const title = inv.getContainerTitle();
        if (title === "合成" && inv.getSlot(44)?.getName()?.getString()?.includes("返回大厅 (点击使用)")) {
            log("通过物品检测，确认在SW中", "debug");
            return true;
        }
    } catch (e) {
        log(`isInSW()异常: ${e.message}`, "debug");
    }
    return false;
}

function isInBW() {
    if (!Player.getPlayer()) return false;
    try {
        const inv = Player.openInventory();
        if (!inv) return false;
        const title = inv.getContainerTitle();
        if (title === "合成" && inv.getSlot(44)?.getName()?.getString()?.includes("离开游戏")) return true;
    } catch (e) {
        log(`isInBW()异常: ${e.message}`, "debug");
    }
    return false;
}

function isInZhiYeZhanZheng() {
    if (!Player.getPlayer()) return false;
    try {
        const inv = Player.openInventory();
        if (!inv) return false;
        const title = inv.getContainerTitle();
        if (title === "合成" && inv.getSlot(44)?.getName()?.getString() === "职业解锁! (长按点击!)") {
            return true;
        }
    } catch (e) {
        log(`isInZhiYeZhanZheng()异常: ${e.message}`, "debug");
    }
    return false;
}

function checkSurroundingChunkLoaded(detectRange) {
    if (!World.isWorldLoaded()) return false
    let player = Player.getPlayer()
    if (!player) return false

    let chunkX = Math.floor(player.getX() / 16)
    let chunkZ = Math.floor(player.getZ() / 16)

    // 检查n*n的区块范围（中心+周围）
    for (let dx = -detectRange; dx <= detectRange; dx++) {
        for (let dz = -detectRange; dz <= detectRange; dz++) {
            if (!World.isChunkLoaded(chunkX + dx, chunkZ + dz)) {
                return false
            }
        }
    }
    return true
}

function ircTell(ircId, msg) {
    Chat.say(`.irc chat $tell ${ircId} ${msg}`)
    log(`.irc chat $tell ${ircId} ${msg}`)
}

function formatDuration(durationMs) {
    if (durationMs < 1000) {
        return `${durationMs}ms`;
    }

    const seconds = durationMs / 1000;
    return `${seconds.toFixed(2)}s`;
}

const TEAM_CREATE_COOLDOWN = 10100; // 多100ms 防服务器卡
const teamState = {
    hasTeam: false,
    teamStatusKnown: false,
    lastCreateTime: 0,
    awaitingList: false,
    listRequestTime: 0,
    pendingCreateTime: 0
};

function getCreateCooldownRemaining() {
    if (teamState.lastCreateTime <= 0) return 0;
    return Math.max(0, TEAM_CREATE_COOLDOWN - (Date.now() - teamState.lastCreateTime));
}

function isCreateCooling() {
    return getCreateCooldownRemaining() > 0;
}

function updateTeamState(hasTeam, createTime = null) {
    teamState.hasTeam = hasTeam;
    teamState.teamStatusKnown = true;
    teamState.awaitingList = false;

    if (hasTeam && createTime !== null) {
        teamState.lastCreateTime = createTime;
    }

    if (!hasTeam) {
        teamState.pendingCreateTime = 0;
    }
}

function requestTeamStatus() {
    teamState.awaitingList = true;
    teamState.listRequestTime = Date.now();
    Chat.say("/zd list")
    log("查询当前队伍状态", "debug")
}

function refreshTeamStatus(timeout = 1500) {
    requestTeamStatus();
    if (!waitUntil(() => !teamState.awaitingList, timeout)) {
        teamState.awaitingList = false;
        log("查询队伍状态超时，继续使用当前缓存状态", "warn")
        return false;
    }
    return true;
}

function disbandTeam(reason = "") {
    Chat.say("/zd disband")
    log(`解散队伍${reason ? `: ${reason}` : ""}`, "debug")
    // refreshTeamStatus()

    updateTeamState(false) // 暂时这么写

    return !teamState.hasTeam;
}

function createTeam() {
    teamState.pendingCreateTime = Date.now();
    Chat.say("/zd create")
    log("创建队伍", "debug")

    safeSleep(100)
    updateTeamState(true) // 暂时这么写
    // safeSleep(200)
    // refreshTeamStatus()

    if (teamState.hasTeam) {
        updateTeamState(true, teamState.pendingCreateTime)
        log("创建队伍成功", "debug")
        return true;
    }

    teamState.pendingCreateTime = 0;
    log("创建队伍后未检测到队伍", "error")
    return false;
}

function kickCurrentPlayer(reason = "") {
    const current = queueSystem.getCurrent();
    if (!current) {
        log("当前没有可踢出的处理对象", "warn")
        return false;
    }

    Chat.say(`/zd kick ${current.playerId}`)
    log(`踢出当前处理玩家 ${current.playerId}${reason ? `: ${reason}` : ""}`, "debug")
    return true;
}

function cleanupExpiredTeam() {
    if (teamState.hasTeam && queueSystem.queue.length === 0 && !isCreateCooling()) {
        disbandTeam("队伍创建已超过10秒，任务结束后自动解散")
    }
}

function ensureTeamReadyForInvite() {
    // refreshTeamStatus();

    const hasTeam = teamState.hasTeam;
    const cooling = isCreateCooling();
    const remaining = Math.ceil(getCreateCooldownRemaining() / 1000);

    log(`队伍状态检查: hasTeam=${hasTeam}, createCooling=${cooling}, remaining=${remaining}s`, "debug")

    if (hasTeam && cooling) {
        return true;
    }

    if (!hasTeam && !cooling) {
        // disbandTeam("准备重新创队前重置状态")
        return createTeam();
    }

    if (!hasTeam && cooling) {
        log("异常：创队仍在10秒冷却中，但当前检测为没有队伍", "error")
        Chat.say("/zd disband")
        safeSleep(50)
        updateTeamState(false)
        return false;
    }

    // disbandTeam("队伍存在但已超过10秒，重建队伍")
    return createTeam();
}

function joinGame(gamemode) {
    try {
        const config = GAMEMODES[gamemode];
        if (!config) {
            log(`未知的玩法: ${gamemode}`, "error");
            return false;
        }

        // 虚空房诊断（在真正开始前检测）
        if (!Player.getPlayer()) {
            log("joinGame开始时玩家实体不存在！", "error");
            return false;
        }

        // 前往对应大厅
        if (!isInHub()) {
            log("不在大厅，正在前往大厅...", "debug")
            Chat.say("/hub")
            if (!waitUntil(isInHub, 3000)) {
                log("进入大厅超时 (3s)，放弃此玩种", "error");
                return false;
            }
            safeSleep(500)
        }

        if (config.type === 'sw') {
            if (!isInSWHub()) {
                if (!Player.getPlayer()) return false;
                switchHotbar(0)
                safeSleep(50)
                if (!Player.getPlayer()) return false;
                Player.getInteractionManager().interactItem(false)
                waitScreen("玩法选择", 1000)
                Player.openInventory().click(11) // 空岛大厅是11号槽
                waitUntil(isInSWHub, 2000)
                switchHotbar(3) // 切回空手，防止后续点击NPC时弹出其他东西
                safeSleep(300)
            }
        } else if (config.type === 'bw') {
            if (!isInBWHub()) {
                if (!Player.getPlayer()) return false;
                switchHotbar(0)
                safeSleep(50)
                if (!Player.getPlayer()) return false;
                Player.getInteractionManager().interactItem(false)
                waitScreen("玩法选择", 1000)
                Player.openInventory().click(10) // 起床大厅是10号槽
                waitUntil(isInBWHub, 2000)
                switchHotbar(3)
                safeSleep(300)
            }
        }

        // 传送到NPC位置
        const [x, y, z] = config.npc;

        // log(`准备传送到NPC: [${x}, ${y}, ${z}]`, "debug");

        if (!Player.getPlayer()) {
            log("玩家实体不存在，无法传送!", "error")
            return false;
        }

        // log(`执行setPos前，玩家位置: ${Player.getPlayer().getX().toFixed(1)}, ${Player.getPlayer().getY().toFixed(1)}, ${Player.getPlayer().getZ().toFixed(1)}`, "debug");

        Player.getPlayer()?.setPos(x + 0.5, y, z + 0.5, true)
        // safeSleep(100)

        // log(`传送到NPC位置: ${Player.getPlayer().getX().toFixed(1)}, ${Player.getPlayer().getY().toFixed(1)}, ${Player.getPlayer().getZ().toFixed(1)}`, "debug")

        Player.getPlayer()?.lookAt(180, 0)

        safeSleep(50)

        interactNPC()

        // 特殊处理：需要点击物品菜单
        if (config.needsClick) {
            log(`等待物品菜单: ${config.screenName}`, "debug");
            if (!waitScreen(config.screenName, 3000)) {
                log(`等待${gamemode}物品菜单超时 (3s)，放弃`, "error");
                return false;
            }
            safeSleep(100)
            Player.openInventory()?.click(config.clickSlot)
            safeSleep(100)
        }

        // 等待进入对应玩法
        let t = 0;
        const targetCheck = config.type === 'sw' ? isInSW : isInBW;
        // log("开始等待进入游戏", "debug")
        while (!targetCheck() && isEnabled() && t < 3000) {
            // log(`等待进入${gamemode}... (${t / 1000}s)`, "debug");
            Time.sleep(50);
            t += 50;
            if (t % 300 === 0) {
                interactNPC()
                log(`疑似卡住未进服！第 ${t / 300} 次 重新与NPC交互`, "warn")
            }
        }

        if (t >= 3000) {
            log(`加入${gamemode}失败`, "warn")
            return false;
        } else {
            log(`成功加入${gamemode}`, "info")
            return true;
        }
    } catch (e) {
        log(`加入${gamemode}时发生错误: ${e.message}`, "error")
    }
}

function interactNPC() {
    if (!Player.getPlayer()) return false;
    const npc = World.getEntities(4)
        .filter(ent => ent.getName().getString().includes("CIT-"))
        .sort((a, b) => a.distanceTo(Player.getPlayer()) - b.distanceTo(Player.getPlayer()))[0];

    if (!npc) {
        log("未找到包含 'CIT-' 的NPC", "warn");
        return false;
    }

    Player.getInteractionManager().interactEntity(npc, false);
    log(`与NPC交互: ${npc.getName().getString()}`, "debug");
    return true;
}

function zdInvite(id) {
    if (!ensureTeamReadyForInvite()) {
        log("邀请中断。队伍状态未通过检查", "warn")
        return false
    }

    Chat.say(`/zd invite ${id}`)
    log(`邀请玩家 ${id} 加入队伍`, "debug")

    return true
}

function zdWarp() {
    const config = GAMEMODES[queueSystem.getCurrent().gamemode];
    if (!config) {
        log(`未知的玩法: ${gamemode}`, "error");
        return false;
    }

    Chat.say("/zd warp")
    log("已发送/zd warp...", "debug")

    queueSystem.getCurrent().warpCompleteTime = Date.now();
    safeSleep(50)
    kickCurrentPlayer("warp后移出当前处理玩家")

    waitUntil(Player.getPlayer, "1000")

    if (config.type === 'sw' || config.type === 'bw') {
        switchHotbar(8)
        waitUntil(() => {
            const hand = Player.getPlayer()?.getMainHand()?.getName()?.getString();
            return hand?.includes("返回大厅") || hand?.includes("离开游戏");
        }, 1000)
        if (!Player.getPlayer()) {
            log("zdWarp时玩家实体不存在！", "error")
            return
        }
        Player.getInteractionManager()?.interactItem(false)
    } else {
        // 职业战争直接执行返回大厅
        safeSleep(100)
        Chat.say("/hub")
    }

    waitUntil(isInHub, "3000")
    if (!isInHub()) {
        Chat.say("/hub")
        log("异常！未退出游戏，退出", "error")
    }
    waitUntil(Player.getPlayer, "1000")
}

// --------- 队列系统 ---------
const queueSystem = {
    queue: [],
    isProcessing: false,
    inviteTimeout: 5000, // 5秒超时

    // 检查队列中是否存在相同的玩家ID
    hasDuplicate(playerId) {
        return this.queue.some(item => item.playerId === playerId);
    },

    // 添加到队列
    add(playerId, ircId, gamemode) {
        this.queue.push({
            playerId,
            ircId,
            gamemode,
            status: 'pending',
            gameJoined: false,
            inviteTime: null,
            startTime: null,
            acceptedTime: null,
            warpCompleteTime: null
        });
        const position = this.queue.length;
        log(`✓ 玩家 ${playerId} (${gamemode}) 已加入队列 (来自: ${ircId})，队列长度: ${position}`, "info");
        return position;
    },

    // 获取当前处理的项
    getCurrent() {
        return this.queue[0];
    },

    // 删除当前项
    removeCurrent() {
        this.queue.shift();
    },

    // 检测邀请是否超时
    checkInviteTimeout() {
        const current = this.getCurrent();
        if (!current || current.status !== 'invited') return;

        const elapsedTime = Date.now() - current.inviteTime;
        if (elapsedTime > this.inviteTimeout) {
            log(`玩家 ${current.playerId} 组队邀请超时 (${(elapsedTime / 1000).toFixed(1)}秒)`, "warn");

            kickCurrentPlayer("组队邀请超时");
            safeSleep(100);
            if (isInBW() || isInSW()) {
                Chat.say("/hub");
                log("组队超时，未退出游戏，退出", "warn");
            }

            // 通知请求者
            ircTell(current.ircId, `组队超时 (5s)`);
            log(`已通知 ${current.ircId} 组队超时`, "debug");

            // 跳过这个玩家，处理下一个
            this.skipCurrentAndNext();
        }
    },

    // 处理队列中的下一个
    processNext() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const current = this.getCurrent();
        current.startTime = Date.now();

        log(`开始处理队列: 玩家ID=${current.playerId}, 玩法=${current.gamemode}`, "info");
        log(`开始计时: 玩家 ${current.playerId} (${current.gamemode})`, "info");

        // 职业战争特殊处理：先进入游戏，再拉人
        if (GAMEMODES[current.gamemode]?.type === 'zyzz') {
            log(`⚡ 职业战争：先进入游戏...`, "info");
            if (!joinGame(current.gamemode)) {
                log(`进入${current.gamemode}失败，跳过`, "error");
                ircTell(current.ircId, `进入${current.gamemode}失败，请稍后重试`);
                this.isProcessing = false;
                this.skipCurrentAndNext();
                return;
            }
            current.gameJoined = true;
        }

        // 拉人
        current.status = 'preparing-team';
        if (!zdInvite(current.playerId)) {
            ircTell(current.ircId, `队伍状态异常，已跳过 ${current.playerId} (${current.gamemode})`);
            this.isProcessing = false;
            this.skipCurrentAndNext();
            return;
        }

        // 记录邀请时间
        current.status = 'invited';
        current.inviteTime = Date.now();

        this.isProcessing = false;
    },

    // 标记当前项为完成
    completeCurrentAndNext() {
        const current = this.getCurrent();
        if (current) {
            const elapsed = current.startTime ? Date.now() - current.startTime : null;
            const inviteElapsed = current.inviteTime && current.acceptedTime ? current.acceptedTime - current.inviteTime : null;
            const warpElapsed = current.startTime && current.warpCompleteTime ? current.warpCompleteTime - current.startTime : null;
            log(`✓ 完成玩家 ${current.playerId} (§b${current.ircId}§r)的流程`, "info");
            if (inviteElapsed !== null) {
                log(`本次发送邀请耗时: ${formatDuration(inviteElapsed)}`, "info");
            }
            if (warpElapsed !== null) {
                log(`本次从开始处理到 warp 完成耗时: ${formatDuration(warpElapsed)}`, "info");
            }
            if (elapsed !== null) {
                log(`本次拉人流程完成，总用时: ${formatDuration(elapsed)}`, "info");
            }
            this.removeCurrent();
        }

        // 处理下一个
        if (this.queue.length > 0) {
            this.processNext();
        }
    },

    // 标记当前项为错误并跳过
    skipCurrentAndNext() {
        const current = this.getCurrent();
        if (current) {
            const elapsed = current.startTime ? Date.now() - current.startTime : null;
            log(`✗ 错误！跳过玩家 ${current.playerId}`, "warn");
            if (elapsed !== null) {
                log(`本次拉人流程结束，总用时: ${formatDuration(elapsed)}`, "warn");
            }
            this.removeCurrent();
        }

        // 处理下一个
        if (this.queue.length > 0) {
            this.processNext();
        }
    }
};

// 监听器
if (isEnabled()) {
    JsMacros.on("RecvMessage", JavaWrapper.methodToJava(msg => {
        if (!World.isWorldLoaded()) { Client.waitTick(1); return; }
        if (!Player.getPlayer()) { Client.waitTick(1); return; }

        try {
            let msgStr = msg.text.getString();

            if (msgStr.startsWith("成功创建队伍！")) {
                updateTeamState(true, teamState.pendingCreateTime);
            }

            if (msgStr.includes("组队") && msgStr.includes("队伍已被解散 ")) {
                updateTeamState(false)
                log("队伍已被解散，更新队伍状态为false", "debug")
                return;
            }

            if (msgStr.includes("你没有队伍") && msgStr.includes("加入队伍后再使用该命令")) {
                updateTeamState(false)
                log("/zd list 检测结果: 当前没有队伍", "debug")
                return;
            }

            if (msgStr.includes("当前队伍ID")) {
                const createTime = teamState.pendingCreateTime > 0 ? teamState.pendingCreateTime : null;
                updateTeamState(true, createTime)
                log("/zd list 检测结果: 当前已有队伍", "debug")
                return;
            }

            // ===== IRC 命令处理 =====
            if (msgStr.startsWith("[S] [IRC]")) {
                // [S] [IRC] Bi_Diu -> You: .i 123123
                const ircMatch = msgStr.match(/\[S\] \[IRC\] (\S+) -> You: (.+)/);
                if (!ircMatch) return;

                const ircId = ircMatch[1];
                const command = ircMatch[2];

                // 检查命令是否以 .i 开头
                if (command.startsWith(".i ")) {
                    const args = command.substring(3).trim().split(/\s+/);
                    const playerId = args[0];
                    const gamemode = args[1];

                    if (!gamemode || !GAMEMODES[gamemode]) {
                        log(`✗ 无效的玩法: ${gamemode}`, "warn");
                        ircTell(ircId, `无效的玩法 "${gamemode}" ！\n 支持玩法: sw1, sw2, swwzy, xyzz1, xyzz2, bw8-1, bw8-2, bw4-4, bwxp4-8, bwxp8-4, bwxp32-32, bwwuhuo, zyzz`);
                        return;
                    }

                    if (playerId && playerId.match(/^[\w\u4e00-\u9fff]+$/)) {
                        // 检查队列中是否已存在相同的玩家ID
                        if (queueSystem.hasDuplicate(playerId)) {
                            log(`玩家 ${playerId} 已在队列中，拒绝重复添加`, "warn");
                            ircTell(ircId, `玩家 ${playerId} 已有相同任务在队列中，请稍后再试`);
                            return;
                        }

                        const position = queueSystem.add(playerId, ircId, gamemode);

                        // 告诉请求者位置
                        if (position === 1) {
                            ircTell(ircId, `${playerId} (${gamemode})，第1位 即将开始 请在5秒内入队`);
                        } else {
                            ircTell(ircId, `${playerId} (${gamemode})，您是第${position}位`);
                        }

                        // 如果不在处理，开始处理队列
                        if (!queueSystem.isProcessing && queueSystem.queue.length === 1) {
                            queueSystem.processNext();
                        }
                    } else {
                        log(`✗ 无效的玩家ID: ${playerId}`, "warn");
                        ircTell(ircId, `无效的玩家ID！"${playerId}"`);
                    }
                }
                return;
            }

            // ===== 玩家加入组队消息检测 =====
            if (msgStr.includes("加入队伍！") && !msgStr.includes("[")) {
                const playerNameMatch = msgStr.match(/(\S+)加入队伍！/);
                if (playerNameMatch) {
                    const playerName = playerNameMatch[1];
                    log(`检测到玩家加入: ${playerName}`, "info");

                    // 如果有当前处理的项，执行流程
                    const current = queueSystem.getCurrent();
                    if (current && current.status === 'invited') {
                        // 清除超时标记
                        current.status = 'accepted';
                        current.acceptedTime = Date.now();

                        // 如果职业战争已经提前进入游戏，则直接 warp
                        if (current.gameJoined) {
                            log(`⚡ 职业战争：直接执行 zdWarp...`, "info");
                            zdWarp();
                            queueSystem.completeCurrentAndNext();
                            return;
                        }

                        // 非职业战争或其他玩法：进入游戏后再 warp
                        log(`⚡ 执行 joinGame...`, "info");
                        if (!joinGame(current.gamemode)) {
                            log(`进入${current.gamemode}失败，跳过`, "error");
                            ircTell(current.ircId, `进入${current.gamemode}失败，请稍后重试`);
                            queueSystem.skipCurrentAndNext();
                            return;
                        }

                        log(`⚡ 执行 zdWarp...`, "info");
                        zdWarp();

                        queueSystem.completeCurrentAndNext();
                    }
                }
                return;
            }

            // ===== 错误处理: 玩家不在线 =====
            if (msgStr === "§c抱歉！该玩家不在线或不存在" || msgStr === "§c玩家不在线！") {
                log(`玩家不在线或不存在`, "warn");

                const current = queueSystem.getCurrent();
                if (current) {
                    // 通知请求者
                    ircTell(current.ircId, `该玩家(${current.playerId})不在线或不存在`);
                    log(`已通知 ${current.ircId}`, "debug");

                    // 跳过这个玩家，处理下一个
                    queueSystem.skipCurrentAndNext();
                }
                return;
            }

            // ===== 错误处理: 创建队伍冷却 =====
            let regex = /请等待(\d+)秒后再试！/;
            let match = msgStr.match(regex);
            if (match) {
                const remainingSeconds = parseInt(match[1], 10);
                teamState.pendingCreateTime = 0;
                teamState.lastCreateTime = Date.now() - Math.max(0, TEAM_CREATE_COOLDOWN - remainingSeconds * 1000);
                log(`创建队伍冷却，剩余 ${remainingSeconds} 秒`, "warn");
                refreshTeamStatus();
                return;
            }

            if (msgStr === "§c该玩家已经有一个队伍了！") {
                log(`玩家已有队伍！`, "warn");
                const current = queueSystem.getCurrent();
                if (current) {
                    // 通知请求者
                    ircTell(current.ircId, `您(${current.playerId})已有队伍了!`);
                    log(`已通知 ${current.ircId}`, "debug");

                    queueSystem.skipCurrentAndNext();
                }
            }

        } catch (e) {
            log(`处理消息时发生错误: ${e.message}`, "error");
        }
    }));

    JsMacros.on("Title", JavaWrapper.methodToJava(title => {
        if (!World.isWorldLoaded()) { Client.waitTick(1); return; }
        if (!Player.getPlayer()) { Client.waitTick(1); return; }

        let msg = title.message.getString()
        if (msg.includes("开始")) {
            Chat.say("/hub")
            log("游戏开局了，快退出!", "error")
        }
    }));
}



// 主循环
while (isEnabled()) {
    if (!World.isWorldLoaded()) { Client.waitTick(1); continue; }
    if (!Player.getPlayer()) { Client.waitTick(1); continue; }

    if (Player.getPlayer().getPos().getY() === -59.0 && Player.getPlayer().distanceTo(12.5, -59, 10.5) < 1 && World.getBlock(Math.floor(Player.getPlayer().getPos().getX()), Math.floor(Player.getPlayer().getPos().getY()) - 1, Math.floor(Player.getPlayer().getPos().getZ()))?.getId() === "minecraft:polished_diorite") {
        log("检测到小黑屋特征，死号了!", "error")
        JavaWrapper.stop()
    }

    // 检测邀请是否超时
    queueSystem.checkInviteTimeout();

    // 队列为空且创队冷却结束后，统一在主循环里解散队伍
    cleanupExpiredTeam();

    Time.sleep(200);
}
