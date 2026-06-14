"use strict"

/**
 * @interface
 */
class Group {
   collapsed = false;
   color = "blue";
   id = -1;
   title = "";

   extendable = true;
   domain = "";
   // amount of tabs
   tabIds = [];
}

class Grouper {

   grouping = true;
   groups = new Array;

   /**
    * Adds already existing groups into the array
    */
   constructor(groups) {
      this.groups = groups;
   }
   
   static async create() {
      const exis_groups = await browser.tabGroups.query({});
      let groups = new Array;
      if (exis_groups.length !== 0)
      {
         for (const exis_group of exis_groups)
         {
            let newGroup = new Group;

            newGroup.collapsed = exis_group.collapsed;
            newGroup.color = exis_group.color;
            newGroup.id = exis_group.id;
            newGroup.title = exis_group.title;

            const tabsInGroup = await browser.tabs.query({ groupId: exis_group.id });
            newGroup.domain = Grouper.ParseUrl(tabsInGroup[0].url);
            newGroup.tabIds = tabsInGroup.map(tab => tab.id);

            groups.push(newGroup);
         }
      }
      
      return new Grouper(groups);
   }

   /**
    * @param {string} url url of a tab
    * @returns {string} domain of the passed url
    */
   static ParseUrl(url) {
      if (!url || typeof url !== 'string') {
         return '';
      }

      // Proceed special urls
      if (url.startsWith("about:") || url.startsWith("file:") || url.startsWith("chrome:") || 
         url.startsWith("moz-extension:") || url.startsWith("chrome-extension:")) {
         return url;
      }

      // Cut the beginning of the url
      if (url.startsWith("https://"))
         url = url.substring(8);
      else if (url.startsWith("http://"))
         url = url.substring(7);

      const slashIndex = url.indexOf('/');
      if (slashIndex !== -1) {
         url = url.substring(0, slashIndex); 
      }
      
      return url;
   }

   /**
    * @param {Object[]} tabs 
    */
   async GroupTabs() {
      if (!this.grouping)
      {
         console.log("Grouping is off");
         return;
      }

      const tabs = await browser.tabs.query({ currentWindow: true });

      for (const tab of tabs) {

         // Check if groups with the same domain are extendable and group if it is
         let skip = false;
         if (this.groups.length > 0)
         for (let group of this.groups) {
            
            if (Grouper.ParseUrl(tab.url) === group.domain) {
               // Check if the group is able to extend
               if (!group.extendable) {
                  skip = true;
               }
               // Group already existing group with the tab
               else {
                  if (!group.tabIds.includes(tab.id))
                     group.tabIds.push(tab.id);

                  await browser.tabs.group({ groupId: group.id, tabIds: group.tabIds });

                  skip = true;
               }
            }

         }
         if (skip)
            continue;

         // Look for other tabs with the same domain
         let sameDomainTabs = []; // Array of ids

         for ( const tab2 of tabs ) {
            if (Grouper.ParseUrl(tab2.url) === Grouper.ParseUrl(tab.url) && tab2.pinned === false) {
               sameDomainTabs.push(tab2.id);
            }
            else {
               continue;
            }
         } if (sameDomainTabs.length === 0) continue;
         
         if (sameDomainTabs.length > 1) {
            const newGroupId = await browser.tabs.group({ tabIds: sameDomainTabs });
            browser.tabGroups.update(newGroupId, {
               title: Grouper.ParseUrl(tab.url)
            });

            let newGroup = new Group;
            newGroup.id = newGroupId;
            newGroup.title = Grouper.ParseUrl(tab.url);
            newGroup.domain = newGroup.title;
            newGroup.tabIds = sameDomainTabs;
            this.groups.push(newGroup);
         }

      }
   }

   /**
    * @param {number} id id of the group
    * @param {number} ungroup_or_remove 0 means delete from array, 1 means ungroup tabs and delete from array, 2 means remove tabs and delete from array
    */
   async DeleteGroup(id, ungroup_or_remove) {
      let newGroups = new Array;
      for (const group of this.groups) {
         if (group.id === id) {
            if (ungroup_or_remove === 1)
               await browser.tabs.ungroup(group.tabIds);
            else if (ungroup_or_remove === 2)
               await browser.tabs.remove(group.tabIds);
            continue;
         }
         newGroups.push(group);
      }
      this.groups = newGroups;
   }

}