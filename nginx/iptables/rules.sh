iptables-legacy -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables-legacy -A INPUT -i lo -j ACCEPT
iptables-legacy -A INPUT -p tcp --dport 443 -j ACCEPT
iptables-legacy -A INPUT -p tcp -j DROP