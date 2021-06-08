# api.board.aquaco.work

aws 콘솔에서 리전 확인 - 대륙-리전-AZ
	리전: 서버 위치- 도시 단위- 데이터 이전에 드는 비용 차이가 있음, 같은 리전이면 무료이거나 쌈
AZ : 서버 풀 중 하나, 서버가 고장나도 서비스가 멈추지 않게 해준다. HDD RAID-1과 비슷함(high availability)
서버 임대 EC2(elastic compute cloud)
인스턴스 생성 - 일반적인 의미의 서버
	x86 : 4gb ram
ARM : 스마트폰, 냉장고 등 비PC에서 CPU를 쓰기 위해 만든 CPU명령어 체계
인스턴스 유형 선택
	t2.micro : 주로 사용됨 - t:simple instance 특화된 유형이 있음, inf 온라인 특화
	-숫자 : 세대
일반적으로 ipv4, 사물인터넷에 ipv6, 도메인 : ip를 기억하기 쉽게 만들고 ip와 연동한 것
DNS : 도메인->ip 연결하는 서버, DHCP: ip분배하는 서버, DDNS : 유동 ip를 dns로 알리는 서비스 
탄력적 ip주소 할당->  탄력적 ip주소 할당
	cmd - ssh ubuntu@서버ip -i “pem키 주소”
ide에서 사용하기 쉽게 ssh config하는 방법 - ~/.ssh/config 에 저장함





% 리눅스 셀 커멘드 crontab -l:리스트 -e:에딧 - cron: 주기적으로 실행



웹 서비스 - 아파치2 설치
https://www.digitalocean.com/community/tutorials/how-to-install-the-apache-web-server-on-ubuntu-20-04

AWS 보안그룹 인바운드 규칙 편집
유형 : http, https	소스 : ‘모든 위치’

아파치 기본 설정 편집 - 폴더 권한 추가
sudo vim /etc/apache2/apache2.conf
	추가->
<Directory /home/ubuntu/project/>
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
</Directory>
site-availabe config 편집
/etc/apache2/sites-available 우선순위(3자리숫자)-도메인.conf

사이트 설정 활성화
sudo a2ensite .conf
아파치 재시작
sudo systemctl reload apache2
HTTPS 인증서 자동생성 서비스 let’s Encrypt 설치
https://www.digitalocean.com/community/tutorials/how-to-secure-apache-with-let-s-encrypt-on-ubuntu-20-04
.








	
 

