var Board = function(size) {
    this.current_color = Board.BLACK;
    this.size = size;
    this.board = this.create_board(size);
    this.last_move_passed = false;
    this.in_atari = false;
    this.attempted_suicide = false;
};

Board.EMPTY = 0;
Board.BLACK = 1;
Board.WHITE = 2;

/*
 * Returns a size x size matrix with all entries initialized to Board.EMPTY
 */
Board.prototype.create_board = function(size) {
    var m = [];
    for (var i = 0; i < size; i++) {
        m[i] = [];
        for (var j = 0; j < size; j++)
            m[i][j] = Board.EMPTY;
    }
    return m;
};

/*
 * Switches the current player
 */
Board.prototype.switch_player = function() {
    this.current_color = 
        this.current_color == Board.BLACK ? Board.WHITE : Board.BLACK;
};

/*
 * At any point in the game, a player can pass and let his opponent play
 */
Board.prototype.pass = function() {
    if (this.last_move_passed)
        this.end_game();
    this.last_move_passed = true;
    this.switch_player();
};

/*
 * Called when the game ends (both players passed)
 */
Board.prototype.end_game = function() {
    console.log("GAME OVER");
};

/*
 * Attempt to place a stone at (i,j). Returns true iff the move was legal
 */
Board.prototype.play = function(i, j) {
    console.log("Played at " + i + ", " + j);   
    this.attempted_suicide = this.in_atari = false;

    if (this.board[i][j] != Board.EMPTY) {
        return false;
    }

    var color = this.board[i][j] = this.current_color;
    var captured = [];
    var neighbors = this.get_adjacent_intersections(i, j);  // 获得相邻的位置坐标（上下左右）
    var atari = false;

    var self = this;
    _.each(neighbors, function(n) {
        var state = self.board[n[0]][n[1]];
        if (state != Board.EMPTY && state != color) {  // 如果相邻位置中某个不为空，颜色也与下的棋子不一样-------（1）
            var group = self.get_group(n[0], n[1]);
            console.log(group);
            if (group["liberties"] == 0)  // 自由度为 0，应当从棋盘上去除
                captured.push(group);
            else if (group["liberties"] == 1)  // 自由度为 1,受到威胁
                atari = true;
        }
    });

    // detect suicide
    // 如果不存在自由度为零的，二该位置的自由度又为0，那么拒绝自杀行为
    if (_.isEmpty(captured) && this.get_group(i, j)["liberties"] == 0) {
        this.board[i][j] = Board.EMPTY;
        this.attempted_suicide = true;
        return false;
    }

    // 如果存在自由度为 1 的，但与上一次对方吃子的情况相同，则拒绝
    // var group0 = captured[0];
    // console.log(captured);
    // console.log(group0);
    // // var stones0 = group0["stones"];
    // // var stone0 = stones0[0];
    // // var board0 = this.board[stone0[0]][stone0[1]];
    // // if (captured.length == 1 && board0 == this.board[i][j]) {
    // //     console.log("illegal to play");
    // // }
    // if (captured.length == 1) {
    //     var stones0 = group0["stones"];
    //     var stone0 = stones0[0];
    //     var board0 = this.board[stone0[0]][stone0[1]];
    //     this.last_captured = 
    // } && captured[0]["stones"][0][0])

    // 如果存在自由度为零的，那么意味着可以让对方无气，故将可以吃掉的部分置空
    var self = this;
    _.each(captured, function(group) {
        _.each(group["stones"], function(stone) {
            self.board[stone[0]][stone[1]] = Board.EMPTY;
        });
    });

    if (atari)
        this.in_atari = true;

    this.last_move_passed = false;
    this.switch_player();
    return true;
};

/*
 * Given a board position, returns a list of [i,j] coordinates representing
 * orthagonally adjacent intersections
 */
 // 获得相邻的点坐标
Board.prototype.get_adjacent_intersections = function(i , j) {
    var neighbors = []; 
    if (i > 0)
        neighbors.push([i - 1, j]);
    if (j < this.size - 1)
        neighbors.push([i, j + 1]);
    if (i < this.size - 1)
        neighbors.push([i + 1, j]);
    if (j > 0)
        neighbors.push([i, j - 1]);
    return neighbors;
};

/*
 * Performs a breadth-first search about an (i,j) position to find recursively
 * orthagonally adjacent stones of the same color (stones with which it shares
 * liberties). Returns null for if there is no stone at the specified position,
 * otherwise returns an object with two keys: "liberties", specifying the
 * number of liberties the group has, and "stones", the list of [i,j]
 * coordinates of the group's members.
 */
Board.prototype.get_group = function(i, j) {

    var color = this.board[i][j];
    if (color == Board.EMPTY)  // 事实上，此处的判断，与（1）的 state != Board.EMPTY 有点重复
        return null;

    var visited = {}; // for O(1) lookups
    var visited_list = []; // for returning
    var queue = [[i, j]];
    var count = 0;

    while (queue.length > 0) {
        var stone = queue.pop();
        if (visited[stone])  // 如果未访问，则访问，否则跳过，最简单的方式是通过循环一个个判断
            continue;

        var neighbors = this.get_adjacent_intersections(stone[0], stone[1]);
        var self = this;
        _.each(neighbors, function(n) {
            var state = self.board[n[0]][n[1]];
            if (state == Board.EMPTY)
                count++;
            if (state == color)  // 如果颜色相同，则添加入队列
                queue.push([n[0], n[1]]);
        });

        visited[stone] = true;
        visited_list.push(stone);
    }

    return {
        "liberties": count,
        "stones": visited_list
    };
}
