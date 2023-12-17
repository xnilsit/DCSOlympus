<img width="600" src="https://github.com/Pax1601/DCSOlympus/assets/103559271/50039435-757b-4fe3-8058-a73376be669d"/>

### DCS Olympus is now available!</div> </br> You can [download the latest version](https://github.com/Pax1601/DCSOlympus/releases) from the release section.

DCS: Olympus is a free and open-source mod for DCS that enables dynamic real-time control through a map interface. The user is able to spawn units/groups, deploy a variety of effects such as smoke, flares, or explosions, and waypoints/tasks can be given to AI units in real-time in a way similar to a classic RTS game. DCS Olympus is open source and available to download for free!

**For installation instructions and usage guide, please visit the [DCS Olympus Wiki](https://github.com/Pax1601/DCSOlympus/wiki).**

<img align="left" width="30" src="https://github.com/Pax1601/DCSOlympus/assets/103559271/0ecff279-a87c-4e2d-a4c7-da98c74adf38">

[**Join our Discord**](https://discord.gg/kNAQkhUHnQ)

<img align="left" width="30" src="https://github.com/Pax1601/DCSOlympus/assets/103559271/1c0dd3fd-339c-4b03-94da-3e5215b0358a">

[**YouTube channel**](https://www.youtube.com/@DCSOlympus)

</br>

## What is Olympus?
DCS: Olympus is a free and open-source mod for Digital Combat Simulator (DCS) that enables dynamic real-time control of units through a map interface. Spawn units and groups of all types, give them commands and tasks like a classic RTS game, and deploy a variety of effects such as smoke, flares, or explosions - all live while the mission is running!

Olympus also includes many additional extras to enhance missions, including creating and tasking Tankers and AWACs on the fly, setting up custom formations, simulated firefights, dynamic accuracy and scenic settings for AAA - plus much more!

Create the ultimate missions for your Squadron by controlling them in real-time for an experience never before seen inside DCS - for both Singleplayer and Multiplayer. 

DCS Olympus requires no client mods, can handle custom modules and is designed from the ground up with performance in mind.
The full feature list is simply too long to enumerate in a short summary, but needless to say Olympus offers unique gameplay that has previously not existed within DCS World, and enhances many other elements of DCS in exciting ways! 

</br>

## How to install
### Singleplayer install
1. Download and unpack the latest release archive from the Github releases page.
2. Install node.js with the provided installer (node-v20.10.0-x64.msi). You can change where node.js is installed if you want, but keep the other options to their default values.
3. Run the Olympus installer and select the Local Installation option.
4. Configure the options via the installer. You can keep the default frontend and backend ports, but you will need to enter Game Master, Blue Commander, and Red Commander passwords.
5. Start a mission, click on the Olympus Client shortcut on your desktop.
6. Login to DCS Olympus by using any username and the password you setup during installation. Enjoy!

### Dedicated Server install
1. Download and unpack the latest release archive from the Github releases page
2. Install node.js with the provided installer (node-v20.10.0-x64.msi). You can change where node.js is installed if you wish to do so, but keep the other options to their default values
3. Run the Olympus installer and select the Dedicated server installation option
4. Configure the options via the installer. You can keep the default frontend and backend ports, but you will have to enter new Game Master, Blue Commander, and Red Commander passwords
5. Enable port forwarding for TCP & UDP on the frontend and backend port you selected during the step above
6. For security reasons, your Olympus server will not be reachable from outside computers by default. To achieve that you have two options.
   a) Run your DCS Server (not the Olympus server!) as administrator   
   b) Enable url reservation for your user. To do so, run this command on a administrator command window: `netsh http add urlacl url="http://*:<backend port>/olympus/" user=<user-running-olympus>`
7. Replace <backend port> with the backend port you selected during installation (3001 by default) and <user-running-dcs> with the name of the user that executes the DCS server. Note that this step is only required once, but must be repeated if the backend port is modified.
8. Start the Olympus server running the shortcut on your desktop
9. Start a mission and enjoy! People will be able to connect to your Olympus using their browsers by entering <server address>:<frontend port> in the address bar of any up-to-date browser.

For a full installation guide, plus common troubleshooting and a full user guide, see the [DCS Olympus Wiki](https://github.com/Pax1601/DCSOlympus/wiki).

</br>

## Frequently Asked Questions
### Can I join up and help out with the project? ###
We are currently running towards first release in the very near future so we are not looking to add more people to the core team for the moment. However that does not mean we are not open to collaborations and help going forward, if you want to help for now we are committed to the free and open source model so feel free to check out the github, familiarize yourself with the project and maybe even start submitting pull requests for open issues.

Post-release we will be more interested in developing partnerships/collaborations with other teams/projects and potentially bringing in more team members, we will update this after release on how that will be managed!

### Can I be a beta/alpha-tester? ###
With first public release planned for the very-near future we are fully committed to the final sprint, as such we will not be formally recruiting more people to test pre-release. 

Post-release we will be eager to hear feedback of all forms and take in bug-reports, at this time after release we will begin considering bringing in more team members to test in development versions as we go.

### Do you have a roadmap? ###
We do not have a roadmap no, we have a laundry list of things we are hoping to do. 

These include but are not limited to:
1) Enhancements to helicopter play
2) More features around use of ground units
3) More unique effects and behaviours
4) ATC/AIC features
5) Usability features like unit painters etc

However we cannot commit to specific features, feature release order, or timelines, please remember this isn't our job and we work on it in our free time because we love DCS

### Does Olympus support mods? ###
Generally OIympus will not have any issues with other mods, however you may need to tell olympus about modded units in order to be able to dynamically spawn them etc
Keep in mind that any mods you do choose to spawn your players will need to have, some mod unit just appear as a su27 or leo2 etc. When a player is missing them, others can cause client crashes. So be smart about how you use them.

### Is Olympus compatible with mission scripts? ###
We have tried hard to keep Olympus from interfering with other scripts, we have tested with a variety of new and old mission scripts and generally expect it will not be an issue.

However we cannot foresee everything people come up with so we suggest testing with what you have in mind once olympus releases

### How does it work? ###
The quick answer is magic. 
The long answer is well all the code is there for you to read. 
The middle answer is a bit like SRS does. Olympus consists of two parts. 

(A) Olympus back end: A dll, run by DCS, that sends data out and gets commands in via a REST API;
(B) Webserver exe: The one you start when starting the server via the desktop shortcut. 

A and B never communicate when you connect the client you download the web page and some other minor stuff from B, and you get the DCS data from and send commands to A.

### How much does Olympus impact performance? ###
Olympus by itself should not have a noticeable impact on server performance, however the ability for the user to spawn arbitrary units and command engagements means Olympus can be used in such a way that brings the game to it's knees.

Be cognizant of how you play, whether it's done through Olympus or the mission editor 500 MLRS units firing at once is not going to go over well with most servers
 
    
    
    

    
