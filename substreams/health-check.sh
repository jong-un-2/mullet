#!/bin/bash

# 健康检查脚本 for Mars V8 Substreams Container

# 检查健康检查服务器
check_health_server() {
    curl -f -s http://localhost:8080 > /dev/null 2>&1
    return $?
}

# 检查 Substreams 进程
check_substreams_process() {
    pgrep -f "substreams-sink-sql" > /dev/null 2>&1
    return $?
}

# 检查日志是否有新的活动
check_log_activity() {
    local log_file="/app/logs/substreams.log"
    
    if [ ! -f "$log_file" ]; then
        return 1
    fi
    
    # 检查最近5分钟是否有日志更新
    local last_modified=$(stat -c %Y "$log_file" 2>/dev/null || echo 0)
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_modified))
    
    # 如果日志文件超过5分钟没更新，认为不健康
    if [ $time_diff -gt 300 ]; then
        return 1
    fi
    
    return 0
}

# 检查数据库连接
check_database() {
    if [ -z "$SUBSTREAMS_SINK_POSTGRES_DSN" ]; then
        return 1
    fi
    
    timeout 10 psql "$SUBSTREAMS_SINK_POSTGRES_DSN" -c "SELECT 1" > /dev/null 2>&1
    return $?
}

# 主健康检查
main() {
    local exit_code=0
    local status_msg=""
    
    # 检查健康服务器
    if ! check_health_server; then
        status_msg="${status_msg}Health server down; "
        exit_code=1
    fi
    
    # 检查 Substreams 进程
    if ! check_substreams_process; then
        status_msg="${status_msg}Substreams process not running; "
        exit_code=1
    fi
    
    # 检查日志活动
    if ! check_log_activity; then
        status_msg="${status_msg}No recent log activity; "
        exit_code=1
    fi
    
    # 检查数据库连接
    if ! check_database; then
        status_msg="${status_msg}Database connection failed; "
        exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ Container healthy"
    else
        echo "❌ Container unhealthy: ${status_msg}"
    fi
    
    exit $exit_code
}

main "$@"