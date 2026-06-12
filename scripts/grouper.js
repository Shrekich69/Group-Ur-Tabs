"use strict"

/**
 * @interface
 */
class Group {
   collapsed = false;
   color = "grey";
   id = -1;
   title = "";

   extendable = true;
   domain = "";
   // amount of tabs
   amount = 0;
}

class Grouper {

   grouping = true;
   groups = new Array(Group);

   /**
    * Adds already existing groups into the array
    */
   async constructor() {
      const exGroups = await browser.tabGroups.query({});
      if (exGroups.length !== 0)
      {
         for (let i = 0; i < exGroups.length; i++)
         {
            let newGroup = new Group;

            newGroup.collapsed = exGroups[i].collapsed;
            newGroup.color = exGroups[i].color;
            newGroup.id = exGroups[i].id;
            newGroup.title = exGroups[i].title;

            const tabsInGroup = await browser.tabs.query({ groupId: exGroups[i].id });
            newGroup.domain = ParseUrl(tabsInGroup[0].url);
            newGroup.amount = tabsInGroup.length;

            this.groups.push(newGroup);
         }
      }
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
         for (let group of this.groups) {
            
            if (ParseUrl(tab.url) === group.domain) {
               // Check if the group is able to extend
               if (!group.extendable) {
                  skip = true;
               }
               // Group already existing group with the tab
               else {
                  // Get tabs ids in the group, then push tab id to the other ids
                  let tabsIds = tabs.map(tab => {
                     if (tab.groupId = group.id)
                        return tab.id;
                  });
                  tabsIds.push(tab.id);

                  await browser.tabs.group({ groupId: group.id, tabsIds: tabsIds });
                  group.amount += 1;

                  skip = true;
               }
            }

         }
         if (skip)
            continue;

         // Look for other tabs with the same domain
         let sameDomainTabs = []; // Array of ids

         for ( const tab2 of tabs ) {
            if ( ParseUrl(tab2.url) === ParseUrl(tab.url) && tab2.pinned === false ) {
               sameDomainTabs.push(tab2.id);
            }
            else {
               continue;
            }
         }
         
         if (sameDomainTabs.length > 0) {
            const newGroupId = await browser.tabs.group({ tabsIds: sameDomainTabs });
            browser.tabGroups.update(newGroupId, { title: ParseUrl(tab.url) });
         }

      }
   }

}